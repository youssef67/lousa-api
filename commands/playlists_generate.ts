import { playlistsList } from '#data/playlists'
import { playlistsPending } from '#data/playlists_pending'
import { DataTrack } from '#interfaces/playlist_interface'
import Playlist from '#models/playlist'
import PlaylistTrack from '#models/playlist_track'
import SpotifyUser from '#models/spotify_user'
import Track from '#models/track'
import TracksVersus from '#models/tracks_versus'
import User from '#models/user'
import TrackService from '#services/track_service'
import VersusService from '#services/versus_service'
import { ModelStatus } from '#types/model_status'
import { TrackStatus } from '#types/track_status'
import { TracksVersusStatus } from '#types/versus.status'
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
      await this.delay(this.getRandomInt(30000, 30500))

      await this.generateTracks(data)
      // await this.generateVersus(this.streamer!)
    } catch (error) {
      console.error(error)
      this.logger.error(`Failed to generate access: ${error.message}`)
    }
  }

  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async cleanOldData() {
    const viewers = await User.all()

    for (const viewer of viewers) {
      await viewer.related('favoritesPlaylists').detach()
      await viewer.related('favoritesSpaceStreamers').detach()
      await viewer.related('versusTracks').detach()
    }

    await Playlist.query().delete()
    await Track.query().delete()
    await PlaylistTrack.query().delete()
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

    const nbLimitTracksByPlaylist = 6
    for (const playlist of data.playlistsCreated) {
      await this.delay(this.getRandomInt(30000, 30500))

      let nbMusicsToCreate = this.getRandomInt(5, 10)
      const genre = playlist.playlistName.split('-')[0]
      const TracksSelected: Music[] = []
      const TracksMeta: {
        music: Music
        foundTrack: any
        isRanked: boolean
        adjustedScore: number
      }[] = []

      let remaining = nbMusicsToCreate

      while (remaining > 0) {
        const selectedMusic = await this.selectRandomMusics(genre, 1, playlistsList)

        if (TracksSelected.find((item) => item.title === selectedMusic[0].title)) {
          continue
        }

        const foundTrack = await this.searchTrackOnSpotify(
          data.streamer.spotifyUser.accessToken,
          selectedMusic[0]
        )
        if (!foundTrack) continue

        TracksSelected.push(selectedMusic[0])

        const isRanked = remaining <= nbLimitTracksByPlaylist

        TracksMeta.push({
          music: selectedMusic[0],
          foundTrack,
          isRanked,
          adjustedScore: 0, // on définit plus tard selon la position réelle
        })

        remaining--
      }

      // Trier les musiques ranked et attribuer une position + score fixe basé sur la position
      const rankedTracks = TracksMeta.filter((t) => t.isRanked)

      rankedTracks.forEach((track, index) => {
        track.adjustedScore = 100 - index * 10 // ex: 100, 90, 80...
      })

      for (const trackMeta of TracksMeta) {
        const { foundTrack, isRanked } = trackMeta

        if (isRanked) {
          const index = rankedTracks.findIndex((rt) => rt.foundTrack.id === foundTrack.id)
          trackMeta.adjustedScore = 100 - index * 10
        } else {
          trackMeta.adjustedScore = 0 // valeur par défaut pour les non-ranked
        }

        if (isRanked) {
          const newSnapshotId = await this.addTrackOnSpotify(
            playlist,
            foundTrack.id,
            data.streamer.spotifyUser.accessToken
          )

          playlist.spotifySnapShotId = newSnapshotId
        }

        const randomUserId = usersIdsArray[this.getRandomInt(0, usersIdsArray.length - 1)]

        await db.transaction(async (trx) => {
          const track = await this.createOrGetTrack(foundTrack, trx)

          const playlistTrack = new PlaylistTrack()
          playlistTrack.playlistId = playlist.id
          playlistTrack.trackId = track.id
          playlistTrack.userId = randomUserId
          playlistTrack.score = trackMeta.adjustedScore
          playlistTrack.isRanked = isRanked
          playlistTrack.position = isRanked
            ? rankedTracks.findIndex((rt) => rt.foundTrack.id === foundTrack.id) + 1
            : null
          playlistTrack.status = isRanked ? TrackStatus.Active : TrackStatus.Inactive
          playlistTrack.useTransaction(trx)
          await playlistTrack.save()
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
    return this.getRandomInt(min, max)
  }
}
