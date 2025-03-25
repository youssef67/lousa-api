import { playlistsList } from '#data/playlists'
import { playlistsPending } from '#data/playlists_pending'
import Playlist from '#models/playlist'
import PlaylistPendingTrack from '#models/playlist_pending_track'
import PlaylistTrack from '#models/playlist_track'
import SpotifyUser from '#models/spotify_user'
import Track from '#models/track'
import TracksVersus from '#models/tracks_versus'
import User from '#models/user'
import { ModelStatus } from '#types/model_status'
import { TrackStatus } from '#types/track_status'
import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'
import axios from 'axios'
import { DateTime } from 'luxon'

interface PlaylistData {
  genre: string
  musics: Music[]
}

interface Music {
  title: string
  artist: string
}

export default class PlaylistsGenerate extends BaseCommand {
  static commandName = 'playlists:generate'
  static description = 'gerate playlists for a specific user'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({
    description: 'streamer who will generate the playlists',
    required: true,
  })
  declare streamer?: string

  @args.string({
    description: 'boolean to clean old data or not',
    required: true,
  })
  declare cleanData?: string

  async run() {
    try {
      this.logger.info(`generate playlists...`)

      if (this.cleanData === 'true') {
        await this.cleanOldData()
      }

      let data = await this.playlistsGenerate(this.streamer!)
      await this.generateTracks(data)
      await this.generatePendingTracks(data)
      await this.generateVersus(this.streamer!)
    } catch (error) {
      console.error(error)
      this.logger.error(`Failed to generate access: ${error.message}`)
    }
  }

  async cleanOldData() {
    const viewers = await User.all()

    for (const viewer of viewers) {
      await viewer.related('favoritesPlaylists').detach()
      await viewer.related('favoritesSpaceStreamers').detach()
    }

    await Playlist.query().delete()
    await Track.query().delete()
    await PlaylistTrack.query().delete()
    await PlaylistPendingTrack.query().delete()
    await TracksVersus.query().delete()
  }

  async playlistsGenerate(email: string) {
    const user = await User.query()
      .whereLike('email', `%${email}%`)
      .preload('spotifyUser', (sp) => {
        sp.preload('spaceStreamer')
      })
      .first()

    if (!user) {
      throw new Error(`User with email streamer is not found`)
    }

    const newAccessToken = await user.spotifyUser.refreshAccessToken()

    // TODO Future improvements n°1
    await db.transaction(async (trx) => {
      user.spotifyUser.accessToken = newAccessToken.access_token
      user.spotifyUser.tokenExpiresAt = DateTime.fromJSDate(new Date()).plus({
        seconds: newAccessToken.expires_in,
      })
      user.spotifyUser.scope = newAccessToken.scope
      user.spotifyUser.useTransaction(trx)
      await user.spotifyUser.save()
    })

    const nbPlaylists = 3
    const selectedPlaylists = await this.selectRandomPlaylists(playlistsList, nbPlaylists)

    let playlistsCreated = []
    for (const playlist of selectedPlaylists) {
      const responseSpotify = await this.createPlaylistOnSpotify(
        user.spotifyUser,
        `${playlist.genre}-${user.spotifyUser.spaceStreamer.nameSpace}`
      )

      const newPlaylist = new Playlist()
      await db.transaction(async (trx) => {
        newPlaylist.playlistName = responseSpotify.name
        newPlaylist.spotifyPlaylistId = responseSpotify.id
        newPlaylist.spotifySnapShotId = responseSpotify.snapshot_id
        newPlaylist.spaceStreamerId = user.spotifyUser.spaceStreamerId
        newPlaylist.status = ModelStatus.Enabled
        newPlaylist.useTransaction(trx)
        await newPlaylist.save()
      })

      playlistsCreated.push(newPlaylist)
    }

    return { streamer: user, playlistsCreated: playlistsCreated }
  }

  async generateTracks(data: { streamer: User; playlistsCreated: Playlist[] }) {
    const users = await User.query().whereLike('email', '%viewer%')
    const usersIdsArray = users.map((item) => item.id)

    for (const playlist of data.playlistsCreated) {
      let nbMusics = 6
      let attempts = 0
      const genre = playlist.playlistName.split('-')[0]
      let TracksSelected: Music[] = []

      do {
        attempts++
        // Choose a random music from the genre
        const selectedMusic = await this.selectRandomMusics(genre, 1, playlistsList)

        // Check if the music is already selected
        if (TracksSelected.find((item) => item.title === selectedMusic[0].title)) {
          continue
        }

        const foundTrack = await this.searchTrackOnSpotify(
          data.streamer.spotifyUser.accessToken,
          selectedMusic[0]
        )
        if (!foundTrack) continue

        // Add the music to the selected list
        TracksSelected.push(selectedMusic[0])

        try {
          const isRanked = nbMusics < 5
          const adjustedScore = isRanked ? (6 - nbMusics + 1) * 10 : 999

          if (isRanked) {
            const newSnapshotId = await this.addTrackOnSpotify(
              playlist,
              foundTrack.id,
              data.streamer.spotifyUser.accessToken
            )

            playlist.spotifySnapShotId = newSnapshotId
          }

          const randomUserId = usersIdsArray[Math.floor(Math.random() * usersIdsArray.length)]

          await db.transaction(async (trx) => {
            const track = await this.createOrGetTrack(foundTrack, trx)

            const playlistTrack = new PlaylistTrack()
            playlistTrack.playlistId = playlist.id
            playlistTrack.trackId = track.id
            playlistTrack.userId = randomUserId
            playlistTrack.score = adjustedScore
            playlistTrack.position = isRanked ? nbMusics : null
            playlistTrack.isRanked = isRanked
            playlistTrack.status = isRanked ? TrackStatus.Active : TrackStatus.Inactive
            playlistTrack.useTransaction(trx)
            await playlistTrack.save()

            // Mise à jour de la position et du score pour la prochaine musique
            nbMusics--
          })
        } catch (error) {
          this.logger.error(`Failed to process track ${selectedMusic[0].title}: ${error.message}`)
        }
      } while (nbMusics > 0)
    }
  }

  async generatePendingTracks(data: { streamer: User; playlistsCreated: Playlist[] }) {
    const users = await User.query().whereLike('email', '%viewer%')
    const usersIdsArray = users.map((item) => item.id)

    for (const playlist of data.playlistsCreated) {
      let nbMusics = 4
      let attempts = 0
      const genre = playlist.playlistName.split('-')[0]
      let TracksSelected: Music[] = []
      do {
        attempts++
        // Choose a random music from the genre
        const selectedMusic = await this.selectRandomMusics(genre, 1, playlistsPending)

        // Check if the music is already selected
        if (TracksSelected.find((item) => item.title === selectedMusic[0].title)) {
          continue
        }

        // Add the music to the selected list
        TracksSelected.push(selectedMusic[0])

        // Search the track on Spotify
        const foundTrack = await this.searchTrackOnSpotify(
          data.streamer.spotifyUser.accessToken,
          selectedMusic[0]
        )
        if (!foundTrack) continue

        try {
          const randomUserId = usersIdsArray[Math.floor(Math.random() * usersIdsArray.length)]

          await db.transaction(async (trx) => {
            const track = await this.createOrGetTrack(foundTrack, trx)

            const playlistPendingTrack = new PlaylistPendingTrack()
            playlistPendingTrack.playlistId = playlist.id
            playlistPendingTrack.trackId = track.id
            playlistPendingTrack.userId = randomUserId
            playlistPendingTrack.status = TrackStatus.OnHold
            playlistPendingTrack.useTransaction(trx)
            await playlistPendingTrack.save()
          })

          nbMusics--
        } catch (error) {
          this.logger.error(`Failed to process track ${selectedMusic[0].title}: ${error.message}`)
        }
      } while (nbMusics > 0 && attempts < 20)
    }
  }

  async generateVersus(email: string) {
    const playlists = await User.query()
      .whereLike('email', `%${email}%`)
      .preload('twitchUser', (twitchUserQuery) => {
        twitchUserQuery.preload('spaceStreamer', (spaceStreamerQuery) => {
          spaceStreamerQuery.preload('playlists', (playlistsQuery) => {
            playlistsQuery.preload('playlistPendingTracks', (playlistPendingTracksQuery) => {
              playlistPendingTracksQuery.preload('track')
            })
          })
        })
      })
      .first()

    if (playlists) {
      for (const playlist of playlists?.twitchUser.spaceStreamer.playlists) {
        const firstTrack = playlist.playlistPendingTracks[0]
        const secondTrack = playlist.playlistPendingTracks[1]

        await db.transaction(async (trx) => {
          firstTrack.status = TrackStatus.Voting
          firstTrack.useTransaction(trx)
          await firstTrack.save()

          secondTrack.status = TrackStatus.Voting
          secondTrack.useTransaction(trx)
          await secondTrack.save()

          const randomHours = await this.getRandomDurationHours()

          const newVersus = new TracksVersus()
          newVersus.playlistId = playlist.id
          newVersus.firstTrackId = playlist.playlistPendingTracks[0].track.id
          newVersus.secondTrackId = playlist.playlistPendingTracks[1].track.id
          newVersus.firstTrackVotes = 15
          newVersus.secondTrackVotes = 5
          newVersus.closingDate = DateTime.now().plus({ minute: randomHours })
          newVersus.useTransaction(trx)
          await newVersus.save()
        })
      }
    }
  }

  async selectRandomPlaylists(playlistsData: PlaylistData[], numberOfItems: number) {
    return playlistsData.sort(() => 0.5 - Math.random()).slice(0, numberOfItems)
  }

  async selectRandomMusics(genre: string, numberOfItems: number, data: PlaylistData[]) {
    const playlist = data.find((item) => item.genre === genre)

    if (!playlist) {
      throw new Error(`Playlist with genre ${genre} not found`)
    }

    return playlist.musics.sort(() => 0.5 - Math.random()).slice(0, numberOfItems)
  }

  async createPlaylistOnSpotify(spotifyUser: SpotifyUser, playlistName: string) {
    const createPlaylistOnSpotifyRequest = await axios.post(
      `https://api.spotify.com/v1/users/${spotifyUser.spotifyId}/playlists`,
      {
        name: playlistName,
      },
      {
        headers: {
          'Authorization': `Bearer ${spotifyUser.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return createPlaylistOnSpotifyRequest.data
  }

  async searchTrackOnSpotify(accessToken: string, music: Music) {
    const searchTrackRequest = await axios.get(`https://api.spotify.com/v1/search`, {
      params: {
        q: `track:"${music.title}" artist:"${music.artist}"`,
        type: 'track',
        limit: 1,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const track = searchTrackRequest.data.tracks.items[0]
    if (!track) {
      return null
    }

    return track
  }

  async addTrackOnSpotify(playlist: Playlist, trackId: string, accessToken: string) {
    const addTrackRequest = await axios.post(
      `https://api.spotify.com/v1/playlists/${playlist.spotifyPlaylistId}/tracks`,
      {
        uris: [`spotify:track:${trackId}`],
        snapshot_id: playlist.spotifySnapShotId,
        position: 0,
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (addTrackRequest.status !== 201) {
      throw new Error(`Failed to add track to playlist`)
    }

    await Playlist.query().where('id', playlist.id).update({
      spotifySnapShotId: addTrackRequest.data.snapshot_id,
    })

    return addTrackRequest.data.snapshot_id
  }

  private async createOrGetTrack(foundTrack: any, trx?: TransactionClientContract) {
    const existingTrack = await Track.query({ client: trx })
      .where('spotify_track_id', foundTrack.id)
      .first()

    if (existingTrack) {
      return existingTrack
    }

    const newTrack = new Track()
    newTrack.spotifyTrackId = foundTrack.id ?? 'UNKNOWN_ID'
    newTrack.trackName = foundTrack.name ?? 'Unknown Track'
    newTrack.artistName = foundTrack.artists?.[0]?.name ?? 'Unknown Artist'
    newTrack.album = foundTrack.album?.name ?? 'Unknown Album'
    newTrack.cover = foundTrack.album?.images?.[0]?.url ?? ''
    newTrack.url = foundTrack.external_urls?.spotify ?? ''

    if (trx) newTrack.useTransaction(trx)
    await newTrack.save()

    return newTrack
  }

  async getRandomDurationHours(min = 2, max = 4): Promise<number> {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}
