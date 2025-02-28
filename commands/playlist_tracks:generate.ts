import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import axios from 'axios'

import SpotifyUser from '#models/spotify_user'
import { DateTime } from 'luxon'

import db from '@adonisjs/lucid/services/db'

import { titleTracks } from '#data/tracks_list'

import User from '#models/user'
import Playlist from '#models/playlist'
import Track from '#models/track'
import PlaylistTrack from '#models/playlist_track'
import { TrackStatus } from '#types/track_status'

export default class PlaylistTracksGenerate extends BaseCommand {
  static commandName = 'playlist-tracks:generate'
  static description = 'set playlist tracks for a specific playlistId'

  @args.string({
    description: 'email viewer for whom to generate playlist tracks',
    required: true,
  })
  declare emailViewer: string

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info(`Generating playlist tracks...`)
      await this.generatePlaylistTracks()
    } catch (error) {
      console.error(error) // Log the full error
      this.logger.error(`Failed to generate access: ${error.message}`)
    }
  }

  async generatePlaylistTracks() {
    const currentUser = await User.query().where('email', this.emailViewer).first()
    const users = await User.query()
      .whereLike('email', '%viewer%')
      .andWhereNot('email', this.emailViewer)

    if (!currentUser) {
      this.logger.error(`User with email ${this.emailViewer} not found`)
      return
    }

    if (!currentUser.playlistSelected) {
      this.logger.error(`User with email ${this.emailViewer} has no playlist selected`)
      return
    }

    const playlist = await Playlist.query()
      .where('id', currentUser.playlistSelected)
      .preload('spaceStreamer', (spaceStreamer) => {
        spaceStreamer.preload('spotifyUser')
      })
      .first()

    if (!playlist) {
      this.logger.error(`Playlist with id ${currentUser.playlistSelected} not found`)
      return
    }

    const spotifyUser = await SpotifyUser.findBy('id', playlist.spaceStreamer.spotifyUser.id)

    if (!spotifyUser) {
      this.logger.error(`Spotify user with id ${playlist.spaceStreamer.spotifyUser.id} not found`)
      return
    }

    if (spotifyUser.isAccessTokenExpired()) {
      const newAccessToken = await spotifyUser.refreshAccessToken()

      await db.transaction(async (trx) => {
        spotifyUser.accessToken = newAccessToken.access_token
        spotifyUser.tokenExpiresAt = DateTime.now().plus({ seconds: newAccessToken.expires_in })
        spotifyUser.scope = newAccessToken.scope
        spotifyUser.useTransaction(trx)
        await spotifyUser.save()
      })
    }

    // ✅ Génération de tracksList avec 10 titres uniques
    const tracksList: { title: string; artist: string }[] = []
    const usedIndexes = new Set<number>()

    while (tracksList.length < 10) {
      const randomIndex = Math.floor(Math.random() * titleTracks.length)

      if (!usedIndexes.has(randomIndex)) {
        tracksList.push(titleTracks[randomIndex])
        usedIndexes.add(randomIndex)
      }
    }

    console.log('Tracks List:', tracksList)

    // 🔹 Exemple d'appel API avec plusieurs tracks
    for (const track of tracksList) {
      const searchTrackRequest = await axios.get(`https://api.spotify.com/v1/search`, {
        params: {
          q: `track:"${track.title}" artist:"${track.artist}"`,
          type: 'track',
          limit: 1,
        },
        headers: {
          Authorization: `Bearer ${spotifyUser.accessToken}`,
        },
      })

      const foundTrack = searchTrackRequest.data.tracks.items[0]

      const randomIndexForUser = Math.floor(Math.random() * users.length)

      let newTrack: Track = new Track()
      console.log('here')

      console.log(foundTrack.href)
      await db.transaction(async (trx) => {
        newTrack.spotifyTrackId = foundTrack.id!
        newTrack.trackName = foundTrack.name!
        newTrack.artistName = foundTrack.artists[0].name!
        newTrack.album = foundTrack.album.name!
        newTrack.cover = foundTrack.album.images[1].url!
        newTrack.url = foundTrack.href!
        newTrack.submittedBy = users[randomIndexForUser].id
        newTrack.useTransaction(trx)
        await newTrack.save()
      })

      const playlistTrack = new PlaylistTrack()
      await db.transaction(async (trx) => {
        playlistTrack.playlistId = playlist.id
        playlistTrack.trackId = newTrack.id
        playlistTrack.userId = currentUser.id
        playlistTrack.vote = 0
        playlistTrack.position = 0
        playlistTrack.status = TrackStatus.Active
        playlistTrack.useTransaction(trx)
        await playlistTrack.save()
      })
    }
  }
}
