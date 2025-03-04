import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { playlistsList } from '#data/playlists'
import SpotifyUser from '#models/spotify_user'
import { ModelStatus } from '#types/model_status'
import User from '#models/user'
import axios from 'axios'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Playlist from '#models/playlist'
import Track from '#models/track'
import PlaylistTrack from '#models/playlist_track'
import { TrackStatus } from '#types/track_status'

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

  async run() {
    try {
      this.logger.info(`generate playlists...`)
      await this.spaceStreamerGenerate('streamer-1')
      await this.spaceStreamerGenerate('streamer-2')
    } catch (error) {
      console.error(error) // Log the full error
      this.logger.error(`Failed to generate access: ${error.message}`)
    }
  }

  async spaceStreamerGenerate(email: string) {
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
    }

    await this.generateTracks(user)
  }

  async generateTracks(user: User) {
    const users = await User.query().whereLike('email', '%viewer%')
    const usersIdsArray = users.map((item) => item.id)

    const playlists = await Playlist.query().where(
      'space_streamer_id',
      user.spotifyUser.spaceStreamerId
    )

    for (const playlist of playlists) {
      const nbMusics = 8
      const genre = playlist.playlistName.split('-')[0]
      const selectedMusics = await this.selectRandomMusics(genre, nbMusics)

      const trackPromises = selectedMusics.map(async (music) => {
        const foundTrack = await this.searchTrackOnSpotify(user.spotifyUser.accessToken, music)
        if (!foundTrack) return

        try {
          const newSnapshotId = await this.addTrackOnSpotify(
            playlist,
            foundTrack.id,
            user.spotifyUser.accessToken
          )

          playlist.spotifySnapShotId = newSnapshotId
          const randomUserId = usersIdsArray[Math.floor(Math.random() * usersIdsArray.length)]

          await db.transaction(async (trx) => {
            const track = new Track()
            track.spotifyTrackId = foundTrack.id ?? 'UNKNOWN_ID'
            track.trackName = foundTrack.name ?? 'Unknown Track'
            track.artistName = foundTrack.artists?.[0]?.name ?? 'Unknown Artist'
            track.album = foundTrack.album?.name ?? 'Unknown Album'
            track.cover = foundTrack.album?.images?.[0]?.url ?? ''
            track.url = foundTrack.external_urls?.spotify ?? ''
            track.submittedBy = randomUserId
            track.useTransaction(trx)
            await track.save()

            const playlistTrack = new PlaylistTrack()
            playlistTrack.playlistId = playlist.id!
            playlistTrack.trackId = track.id!
            playlistTrack.userId = randomUserId!
            playlistTrack.vote = 0
            playlistTrack.position = 0
            playlistTrack.status = TrackStatus.Active
            playlistTrack.useTransaction(trx)
            await playlistTrack.save()
          })
        } catch (error) {
          this.logger.error(`Failed to process track ${music.title}: ${error.message}`)
        }
      })

      await Promise.all(trackPromises)
    }
  }

  async selectRandomPlaylists(playlistsData: PlaylistData[], numberOfItems: number) {
    return playlistsData.sort(() => 0.5 - Math.random()).slice(0, numberOfItems)
  }

  async selectRandomMusics(genre: string, numberOfItems: number) {
    const playlist = playlistsList.find((item) => item.genre === genre)

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
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('addTrackRequest ----->', addTrackRequest)
    if (addTrackRequest.status !== 201) {
      throw new Error(`Failed to add track to playlist`)
    }

    await Playlist.query().where('id', playlist.id).update({
      spotifySnapShotId: addTrackRequest.data.snapshot_id,
    })

    return addTrackRequest.data.snapshot_id
  }
}
