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
  static commandName = 'versus:generate'
  static description = 'gerate versus for a specific user'

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

      await this.generateVersus(this.streamer!)
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
    await TracksVersus.query().delete()
  }

  async generateVersus(email: string) {
    const user = await User.query()
      .whereLike('email', `%${email}%`)
      .preload('twitchUser', (twitchUserQuery) => {
        twitchUserQuery.preload('spaceStreamer', (spaceStreamerQuery) => {
          spaceStreamerQuery.preload('playlists')
        })
      })
      .preload('spotifyUser')
      .first()

    const viewerFour = await User.query().whereLike('email', '%viewer-4%').first()

    if (!user || !viewerFour) return

    let createAtLeastOneTrackVersusForViewerFour = true
    for (const playlist of user.twitchUser.spaceStreamer.playlists) {
      console.log('playlist id ', playlist.id)
      let nbTracksCreated = this.getRandomInt(5, 10)
      const genre = playlist.playlistName.split('-')[0]

      let TracksSelected: Music[] = []
      let lastCreatedTrack: Track | null = null

      let attempts = 0
      const maxAttempts = 30

      do {
        const selectedMusic = await this.selectRandomMusics(genre, 1, playlistsPending)
        if (TracksSelected.find((item) => item.title === selectedMusic[0].title)) continue

        const foundTrack = await this.searchTrackOnSpotify(
          user.spotifyUser.accessToken,
          selectedMusic[0]
        )
        if (!foundTrack) continue

        TracksSelected.push(selectedMusic[0])

        await db.transaction(async (trx) => {
          const dataTrack: DataTrack = {
            spotifyTrackId: foundTrack.id,
            trackName: foundTrack.name,
            artistName: foundTrack.artists?.[0]?.name,
            album: foundTrack.album?.name,
            cover: foundTrack.album?.images?.[0]?.url,
            url: foundTrack.external_urls?.spotify,
          }

          const currentTrack = await TrackService.addTrack(dataTrack, trx)

          if (lastCreatedTrack) {
            if (createAtLeastOneTrackVersusForViewerFour) {
              const firstUser = await User.query().whereLike('email', '%viewer-4%').first()

              const secondUser = await User.query()
                .whereLike('email', '%viewer%')
                .whereNot('id', firstUser?.id!)
                .orderByRaw('RANDOM()')
                .limit(1)
                .first()

              const tracksVersus = await VersusService.createTracksVersusCommand(
                trx,
                viewerFour.playlistSelected!,
                lastCreatedTrack,
                currentTrack,
                firstUser!,
                secondUser!,
                TracksVersusStatus.VotingProgress
              )

              await trx.insertQuery().table('tracks_versus_users').insert({
                tracks_versus_id: tracksVersus.id,
                user_id: firstUser?.id,
              })

              await trx.insertQuery().table('tracks_versus_users').insert({
                tracks_versus_id: tracksVersus.id,
                user_id: secondUser?.id,
              })
            } else {
              const users = await User.query()
                .whereLike('email', '%viewer%')
                .orderByRaw('RANDOM()')
                .limit(2)

              const tracksVersus = await VersusService.createTracksVersusCommand(
                trx,
                playlist.id,
                lastCreatedTrack,
                currentTrack,
                users[0],
                users[1],
                TracksVersusStatus.OnHold
              )

              for (const u of users) {
                await trx.insertQuery().table('tracks_versus_users').insert({
                  tracks_versus_id: tracksVersus.id,
                  user_id: u.id,
                })
              }
            }
          }

          if (lastCreatedTrack) createAtLeastOneTrackVersusForViewerFour = false
          lastCreatedTrack = currentTrack
          nbTracksCreated--
        })
      } while (nbTracksCreated > 0 && attempts < maxAttempts)
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

  async getRandomDurationHours(min = 2, max = 4): Promise<number> {
    return this.getRandomInt(min, max)
  }
}
