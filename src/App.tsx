import { useState } from 'react'

// Тип для файла с кодом
interface CodeFile {
  name: string
  path: string
  language: string
  description: string
  code: string
}

// Все файлы проекта
const projectFiles: CodeFile[] = [
  {
    name: 'build.gradle.kts (Project)',
    path: 'build.gradle.kts',
    language: 'kotlin',
    description: 'Корневой файл сборки проекта',
    code: `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id("com.android.application") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
}`
  },
  {
    name: 'build.gradle.kts (App)',
    path: 'app/build.gradle.kts',
    language: 'kotlin',
    description: 'Файл сборки модуля app с зависимостями Media3',
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.rgbmusic"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.rgbmusic"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }

    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    // AndroidX Core
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.recyclerview:recyclerview:1.3.2")

    // Media3 (ExoPlayer) — используем Media3, а не старый ExoPlayer!
    implementation("androidx.media3:media3-exoplayer:1.4.1")
    implementation("androidx.media3:media3-ui:1.4.1")
    implementation("androidx.media3:media3-session:1.4.1")

    // Корутины для асинхронной работы
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Coil для загрузки обложек альбомов
    implementation("io.coil-kt:coil:2.6.0")

    // ViewModel и LiveData
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")

    // Activity KTX для viewModels()
    implementation("androidx.activity:activity-ktx:1.8.2")
}`
  },
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    description: 'Манифест приложения с разрешениями и сервисом',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Разрешения для доступа к аудиофайлам -->
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />

    <!-- Разрешения для Foreground Service -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <!-- Уведомления для Android 13+ -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- WakeLock для предотвращения сна при воспроизведении -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.RGBMusic"
        tools:targetApi="31">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.RGBMusic">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.MusicService"
            android:exported="true"
            android:foregroundServiceType="mediaPlayback">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>

    </application>

</manifest>`
  },
  {
    name: 'MainActivity.kt',
    path: 'app/src/main/java/com/example/rgbmusic/MainActivity.kt',
    language: 'kotlin',
    description: 'Главная активность — список треков и управление воспроизведением',
    code: `package com.example.rgbmusic

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import androidx.recyclerview.widget.LinearLayoutManager
import coil.load
import com.example.rgbmusic.adapter.TrackAdapter
import com.example.rgbmusic.databinding.ActivityMainBinding
import com.example.rgbmusic.service.MusicService
import com.example.rgbmusic.viewmodel.PlayerViewModel
import com.google.common.util.concurrent.MoreExecutors

/**
 * Главная активность приложения "RGB Цветомузыка"
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val viewModel: PlayerViewModel by viewModels()
    private lateinit var trackAdapter: TrackAdapter
    private var mediaController: MediaController? = null

    companion object {
        private const val PERMISSION_REQUEST_CODE = 100
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()
        setupPlayerControls()

        if (checkAndRequestPermissions()) {
            initializePlayer()
        }
    }

    private fun setupRecyclerView() {
        trackAdapter = TrackAdapter { track ->
            viewModel.playTrack(this, track)
        }
        binding.recyclerViewTracks.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = trackAdapter
        }
    }

    private fun setupPlayerControls() {
        binding.btnPlayPause.setOnClickListener {
            mediaController?.let { controller ->
                if (controller.isPlaying) controller.pause() else controller.play()
            }
        }
        binding.btnNext.setOnClickListener {
            mediaController?.let { controller ->
                if (controller.hasNextMediaItem()) {
                    controller.seekToNextMediaItem()
                    controller.play()
                }
            }
        }
        binding.btnPrev.setOnClickListener {
            mediaController?.let { controller ->
                if (controller.hasPreviousMediaItem()) {
                    controller.seekToPreviousMediaItem()
                    controller.play()
                }
            }
        }
    }

    private fun initializePlayer() {
        val sessionToken = SessionToken(this, ComponentName(this, MusicService::class.java))
        val future = MediaController.Builder(this, sessionToken).buildAsync()

        future.addListener({
            mediaController = if (future.isDone && !future.isCancelled) future.get() else null
            mediaController?.addListener(playerListener)
            viewModel.loadTracks(this)

            viewModel.trackList.observe(this) { tracks ->
                trackAdapter.submitList(tracks)
            }
            viewModel.currentTrack.observe(this) { track ->
                track?.let {
                    binding.tvTrackTitle.text = it.title
                    binding.tvTrackArtist.text = it.artist
                    loadAlbumArt(it.albumId)
                }
            }
        }, MoreExecutors.directExecutor())
    }

    private fun loadAlbumArt(albumId: Long) {
        val albumUri = android.content.ContentUris.withAppendedId(
            android.provider.MediaStore.Audio.Albums.EXTERNAL_CONTENT_URI, albumId
        )
        binding.ivAlbumArt.load(albumUri) {
            placeholder(R.drawable.ic_music_note)
            error(R.drawable.ic_music_note)
        }
    }

    private val playerListener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            binding.btnPlayPause.setImageResource(
                if (isPlaying) R.drawable.ic_pause else R.drawable.ic_play
            )
        }
        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            mediaItem?.let { viewModel.updateCurrentTrackFromMediaItem(it) }
        }
    }

    private fun checkAndRequestPermissions(): Boolean {
        val permissions = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }
        return if (permissions.isEmpty()) {
            true
        } else {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), PERMISSION_REQUEST_CODE)
            false
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
            initializePlayer()
        }
    }

    override fun onStart() {
        super.onStart()
        if (checkAndRequestPermissions()) {
            val serviceIntent = Intent(this, MusicService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(serviceIntent)
            else startService(serviceIntent)
        }
    }

    override fun onStop() {
        super.onStop()
        mediaController?.removeListener(playerListener)
    }

    override fun onDestroy() {
        super.onDestroy()
        MediaController.releaseFuture(mediaController?.let { /* future */ } ?: return)
    }
}`
  },
  {
    name: 'MusicService.kt',
    path: 'app/src/main/java/com/example/rgbmusic/service/MusicService.kt',
    language: 'kotlin',
    description: 'Foreground Service для воспроизведения музыки с MediaSession',
    code: `package com.example.rgbmusic.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.os.Build
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * Музыкальный сервис на базе Media3 MediaSessionService
 */
class MusicService : MediaSessionService() {

    private var exoPlayer: ExoPlayer? = null
    private var mediaSession: MediaSession? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        exoPlayer = ExoPlayer.Builder(this)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .setUsage(C.USAGE_MEDIA)
                    .build(),
                true
            )
            .setHandleAudioBecomingNoisy(true)
            .build()

        val sessionActivityPendingIntent = packageManager?.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(this, 0, it,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        }

        mediaSession = MediaSession.Builder(this, exoPlayer!!)
            .apply { sessionActivityPendingIntent?.let { setSessionActivity(it) } }
            .build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "music_playback_channel",
                "Воспроизведение музыки",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Канал для уведомлений о воспроизведении музыки"
                setShowBadge(false)
            }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
        }
        mediaSession = null
        exoPlayer = null
        super.onDestroy()
    }
}`
  },
  {
    name: 'MusicLibrary.kt',
    path: 'app/src/main/java/com/example/rgbmusic/data/MusicLibrary.kt',
    language: 'kotlin',
    description: 'Сканер музыкальной библиотеки устройства через MediaStore',
    code: `package com.example.rgbmusic.data

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Класс для сканирования музыкальных файлов на устройстве
 */
object MusicLibrary {

    private const val TAG = "MusicLibrary"
    private var cachedTracks: List<Track>? = null

    suspend fun scanMusic(context: Context): List<Track> = withContext(Dispatchers.IO) {
        cachedTracks?.let { return@withContext it }

        val tracks = mutableListOf<Track>()
        val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI

        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.TRACK,
            MediaStore.Audio.Media.SIZE
        )

        val sortOrder = "\${MediaStore.Audio.Media.ARTIST} ASC, " +
                "\${MediaStore.Audio.Media.ALBUM} ASC, " +
                "\${MediaStore.Audio.Media.TRACK} ASC"

        val selection = "\${MediaStore.Audio.Media.IS_MUSIC} != 0" +
                " AND \${MediaStore.Audio.Media.DURATION} > 5000"

        context.contentResolver.query(collection, projection, selection, null, sortOrder)
            ?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                val albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
                val durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val dataCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)

                while (cursor.moveToNext()) {
                    val id = cursor.getLong(idCol)
                    val title = cursor.getString(titleCol) ?: "Неизвестный трек"
                    val artist = cursor.getString(artistCol) ?: "Неизвестный исполнитель"
                    val album = cursor.getString(albumCol) ?: "Неизвестный альбом"
                    val albumId = cursor.getLong(albumIdCol)
                    val duration = cursor.getLong(durationCol)
                    val data = cursor.getString(dataCol) ?: ""

                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
                    val albumArtUri = ContentUris.withAppendedId(
                        Uri.parse("content://media/external/audio/albumart"), albumId)

                    tracks.add(Track(id, title, artist, album, albumId, duration,
                        contentUri, data, albumArtUri))
                }
            }

        Log.d(TAG, "Найдено треков: \${tracks.size}")
        cachedTracks = tracks
        tracks
    }

    fun clearCache() { cachedTracks = null }
}`
  },
  {
    name: 'Track.kt',
    path: 'app/src/main/java/com/example/rgbmusic/data/Track.kt',
    language: 'kotlin',
    description: 'Модель данных для музыкального трека',
    code: `package com.example.rgbmusic.data

import android.net.Uri
import android.os.Parcelable
import kotlinx.parcelize.Parcelize

/**
 * Модель данных для музыкального трека
 */
@Parcelize
data class Track(
    val id: Long,
    val title: String,
    val artist: String,
    val album: String,
    val albumId: Long,
    val duration: Long,
    val uri: Uri,
    val filePath: String,
    val albumArtUri: Uri
) : Parcelable {

    fun formattedDuration(): String {
        val totalSeconds = duration / 1000
        val minutes = totalSeconds / 60
        val seconds = totalSeconds % 60
        return String.format("%d:%02d", minutes, seconds)
    }
}`
  },
  {
    name: 'PlayerViewModel.kt',
    path: 'app/src/main/java/com/example/rgbmusic/viewmodel/PlayerViewModel.kt',
    language: 'kotlin',
    description: 'ViewModel для связывания UI и MusicService',
    code: `package com.example.rgbmusic.viewmodel

import android.content.ComponentName
import android.content.Context
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.example.rgbmusic.data.MusicLibrary
import com.example.rgbmusic.data.Track
import com.example.rgbmusic.service.MusicService
import kotlinx.coroutines.launch

/**
 * ViewModel для управления состоянием плеера
 */
class PlayerViewModel : ViewModel() {

    private val _trackList = MutableLiveData<List<Track>>()
    val trackList: LiveData<List<Track>> = _trackList

    private val _currentTrack = MutableLiveData<Track?>()
    val currentTrack: LiveData<Track?> = _currentTrack

    private val _isPlaying = MutableLiveData(false)
    val isPlaying: LiveData<Boolean> = _isPlaying

    private var mediaController: MediaController? = null

    fun loadTracks(context: Context) {
        viewModelScope.launch {
            val tracks = MusicLibrary.scanMusic(context)
            _trackList.postValue(tracks)
        }
    }

    fun playTrack(context: Context, track: Track) {
        viewModelScope.launch {
            val controller = getMediaController(context)
            controller?.let { mc ->
                val allTracks = _trackList.value ?: emptyList()
                val mediaItems = allTracks.map { MediaItem.fromUri(it.uri) }
                val trackIndex = allTracks.indexOfFirst { it.id == track.id }

                mc.setMediaItems(mediaItems, trackIndex.coerceAtLeast(0), 0L)
                mc.prepare()
                mc.play()
                _currentTrack.postValue(track)
            }
        }
    }

    fun updateCurrentTrackFromMediaItem(mediaItem: MediaItem) {
        val tracks = _trackList.value ?: return
        val track = tracks.find { it.uri.toString() == mediaItem.localConfiguration?.uri.toString() }
        _currentTrack.postValue(track)
    }

    private suspend fun getMediaController(context: Context): MediaController? {
        if (mediaController != null) return mediaController
        return try {
            val sessionToken = SessionToken(context,
                ComponentName(context, MusicService::class.java))
            val future = MediaController.Builder(context, sessionToken).buildAsync()
            val controller = future.get()
            mediaController = controller
            controller
        } catch (e: Exception) { null }
    }

    override fun onCleared() {
        super.onCleared()
        mediaController = null
    }
}`
  },
  {
    name: 'TrackAdapter.kt',
    path: 'app/src/main/java/com/example/rgbmusic/adapter/TrackAdapter.kt',
    language: 'kotlin',
    description: 'Адаптер RecyclerView для списка треков',
    code: `package com.example.rgbmusic.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.example.rgbmusic.R
import com.example.rgbmusic.data.Track
import com.example.rgbmusic.databinding.ItemTrackBinding

/**
 * Адаптер для RecyclerView со списком музыкальных треков
 */
class TrackAdapter(
    private val onTrackClick: (Track) -> Unit
) : ListAdapter<Track, TrackAdapter.TrackViewHolder>(TrackDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TrackViewHolder {
        val binding = ItemTrackBinding.inflate(
            LayoutInflater.from(parent.context), parent, false)
        return TrackViewHolder(binding)
    }

    override fun onBindViewHolder(holder: TrackViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class TrackViewHolder(
        private val binding: ItemTrackBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(track: Track) {
            binding.tvTrackTitle.text = track.title
            binding.tvTrackArtist.text = track.artist
            binding.tvDuration.text = track.formattedDuration()
            binding.ivTrackArt.load(track.albumArtUri) {
                placeholder(R.drawable.ic_music_note)
                error(R.drawable.ic_music_note)
            }
            binding.root.setOnClickListener { onTrackClick(track) }
        }
    }

    class TrackDiffCallback : DiffUtil.ItemCallback<Track>() {
        override fun areItemsTheSame(oldItem: Track, newItem: Track) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: Track, newItem: Track) = oldItem == newItem
    }
}`
  },
  {
    name: 'activity_main.xml',
    path: 'app/src/main/res/layout/activity_main.xml',
    language: 'xml',
    description: 'Разметка главной активности с плеером и списком треков',
    code: `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#1A1A2E"
    tools:context=".MainActivity">

    <LinearLayout
        android:id="@+id/layoutNowPlaying"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="16dp"
        android:gravity="center"
        app:layout_constraintTop_toTopOf="parent">

        <com.google.android.material.imageview.ShapeableImageView
            android:id="@+id/ivAlbumArt"
            android:layout_width="200dp"
            android:layout_height="200dp"
            android:scaleType="centerCrop"
            android:src="@drawable/ic_music_note"
            app:shapeAppearanceOverlay="@style/RoundedImageView" />

        <TextView
            android:id="@+id/tvTrackTitle"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="16dp"
            android:text="Выберите трек"
            android:textColor="#FFFFFF"
            android:textSize="20sp"
            android:textStyle="bold"
            android:maxLines="1"
            android:ellipsize="end" />

        <TextView
            android:id="@+id/tvTrackArtist"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:text="—"
            android:textColor="#AAAAAA"
            android:textSize="16sp" />
    </LinearLayout>

    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginHorizontal="24dp"
        android:progressTint="#E94560"
        app:layout_constraintTop_toBottomOf="@id/layoutNowPlaying" />

    <LinearLayout
        android:id="@+id/layoutControls"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center"
        android:padding="16dp"
        app:layout_constraintTop_toBottomOf="@id/progressBar">

        <com.google.android.material.floatingactionbutton.FloatingActionButton
            android:id="@+id/btnPrev"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginHorizontal="16dp"
            android:src="@drawable/ic_skip_previous"
            app:fabSize="mini"
            app:backgroundTint="#16213E"
            app:tint="#FFFFFF" />

        <com.google.android.material.floatingactionbutton.FloatingActionButton
            android:id="@+id/btnPlayPause"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:src="@drawable/ic_play"
            app:backgroundTint="#E94560"
            app:tint="#FFFFFF" />

        <com.google.android.material.floatingactionbutton.FloatingActionButton
            android:id="@+id/btnNext"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginHorizontal="16dp"
            android:src="@drawable/ic_skip_next"
            app:fabSize="mini"
            app:backgroundTint="#16213E"
            app:tint="#FFFFFF" />
    </LinearLayout>

    <View
        android:id="@+id/divider"
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:background="#333355"
        android:layout_marginHorizontal="16dp"
        app:layout_constraintTop_toBottomOf="@id/layoutControls" />

    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/recyclerViewTracks"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_marginTop="8dp"
        android:clipToPadding="false"
        android:paddingBottom="16dp"
        app:layout_constraintTop_toBottomOf="@id/divider"
        app:layout_constraintBottom_toBottomOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>`
  },
  {
    name: 'item_track.xml',
    path: 'app/src/main/res/layout/item_track.xml',
    language: 'xml',
    description: 'Разметка элемента списка треков',
    code: `<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.card.MaterialCardView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginHorizontal="12dp"
    android:layout_marginVertical="4dp"
    app:cardBackgroundColor="#16213E"
    app:cardCornerRadius="12dp"
    app:cardElevation="2dp"
    app:strokeWidth="0dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:padding="12dp"
        android:gravity="center_vertical">

        <com.google.android.material.imageview.ShapeableImageView
            android:id="@+id/ivTrackArt"
            android:layout_width="48dp"
            android:layout_height="48dp"
            android:scaleType="centerCrop"
            android:src="@drawable/ic_music_note"
            app:shapeAppearanceOverlay="@style/RoundedImageViewSmall" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:layout_marginStart="12dp">

            <TextView
                android:id="@+id/tvTrackTitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textColor="#FFFFFF"
                android:textSize="16sp"
                android:textStyle="bold"
                android:maxLines="1"
                android:ellipsize="end" />

            <TextView
                android:id="@+id/tvTrackArtist"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="2dp"
                android:textColor="#AAAAAA"
                android:textSize="14sp"
                android:maxLines="1"
                android:ellipsize="end" />
        </LinearLayout>

        <TextView
            android:id="@+id/tvDuration"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="#888888"
            android:textSize="12sp"
            android:layout_marginStart="8dp" />
    </LinearLayout>

</com.google.android.material.card.MaterialCardView>`
  },
  {
    name: 'themes.xml',
    path: 'app/src/main/res/values/themes.xml',
    language: 'xml',
    description: 'Тема приложения с тёмным фоном',
    code: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.RGBMusic" parent="Theme.Material3.Dark.NoActionBar">
        <item name="colorPrimary">#E94560</item>
        <item name="colorPrimaryVariant">#C73E54</item>
        <item name="colorOnPrimary">#FFFFFF</item>
        <item name="colorSecondary">#0F3460</item>
        <item name="colorOnSecondary">#FFFFFF</item>
        <item name="android:colorBackground">#1A1A2E</item>
        <item name="colorSurface">#16213E</item>
        <item name="colorOnSurface">#FFFFFF</item>
        <item name="android:statusBarColor">#1A1A2E</item>
        <item name="android:navigationBarColor">#1A1A2E</item>
    </style>

    <style name="RoundedImageView" parent="">
        <item name="cornerFamily">rounded</item>
        <item name="cornerSize">16dp</item>
    </style>

    <style name="RoundedImageViewSmall" parent="">
        <item name="cornerFamily">rounded</item>
        <item name="cornerSize">8dp</item>
    </style>
</resources>`
  },
  {
    name: 'strings.xml',
    path: 'app/src/main/res/values/strings.xml',
    language: 'xml',
    description: 'Строковые ресурсы приложения',
    code: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">RGB Цветомузыка</string>
    <string name="play">Воспроизвести</string>
    <string name="pause">Пауза</string>
    <string name="next">Следующий</string>
    <string name="prev">Предыдущий</string>
    <string name="no_tracks">Треки не найдены</string>
    <string name="permission_required">Для работы приложения необходим доступ к аудиофайлам</string>
</resources>`
  },
  {
    name: 'ic_music_note.xml',
    path: 'app/src/main/res/drawable/ic_music_note.xml',
    language: 'xml',
    description: 'Иконка ноты (заглушка для обложек)',
    code: `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="#AAAAAA">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M12,3v10.55c-0.59,-0.34 -1.27,-0.55 -2,-0.55 -2.21,0 -4,1.79 -4,4s1.79,4 4,4 4,-1.79 4,-4V7h4V3h-6z" />
</vector>`
  },
  {
    name: 'ic_play.xml',
    path: 'app/src/main/res/drawable/ic_play.xml',
    language: 'xml',
    description: 'Иконка Play',
    code: `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="#FFFFFF">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M8,5v14l11,-7z" />
</vector>`
  },
  {
    name: 'ic_pause.xml',
    path: 'app/src/main/res/drawable/ic_pause.xml',
    language: 'xml',
    description: 'Иконка Pause',
    code: `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="#FFFFFF">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M6,19h4V5H6v14zM14,5v14h4V5h-4z" />
</vector>`
  },
  {
    name: 'ic_skip_next.xml',
    path: 'app/src/main/res/drawable/ic_skip_next.xml',
    language: 'xml',
    description: 'Иконка "Следующий трек"',
    code: `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="#FFFFFF">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M6,18l8.5,-6L6,6v12zM16,6v12h2V6h-2z" />
</vector>`
  },
  {
    name: 'ic_skip_previous.xml',
    path: 'app/src/main/res/drawable/ic_skip_previous.xml',
    language: 'xml',
    description: 'Иконка "Предыдущий трек"',
    code: `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="#FFFFFF">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M6,6h2v12H6zM9.5,12l8.5,6V6z" />
</vector>`
  },
  {
    name: 'settings.gradle.kts',
    path: 'settings.gradle.kts',
    language: 'kotlin',
    description: 'Настройки проекта и репозитории',
    code: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolution {
    @Suppress("UnstableApiUsage")
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "RGBMusic"
include(":app")`
  },
  {
    name: 'gradle.properties',
    path: 'gradle.properties',
    language: 'properties',
    description: 'Свойства Gradle',
    code: `# Project-wide Gradle settings.
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8

# AndroidX
android.useAndroidX=true

# Kotlin
kotlin.code.style=official

# Non-transitive R classes
android.nonTransitiveRClass=true`
  }
]

// Компонент кодового блока с кнопкой копирования
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-md transition-all opacity-0 group-hover:opacity-100 z-10"
      >
        {copied ? '✓ Скопировано!' : '📋 Копировать'}
      </button>
      <pre className="bg-gray-900 rounded-xl p-4 overflow-x-auto text-sm leading-relaxed border border-gray-700">
        <code className={`language-${language} text-gray-100`}>{code}</code>
      </pre>
    </div>
  )
}

// Компонент карточки файла
function FileCard({ file, isActive, onClick }: { file: CodeFile; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 border ${
        isActive
          ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-pink-500/50 text-white'
          : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">
          {file.language === 'kotlin' ? '🟣' : file.language === 'xml' ? '🔵' : '🟢'}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{file.name}</p>
          <p className="text-xs text-gray-500 truncate">{file.path}</p>
        </div>
      </div>
    </button>
  )
}

// Шаги создания проекта
interface SetupStep {
  number: number
  title: string
  icon: string
  description: string
  details: string[]
  tip?: string
  screenshot?: string
}

const setupSteps: SetupStep[] = [
  {
    number: 1,
    title: 'Скачайте Android Studio',
    icon: '📥',
    description: 'Официальная IDE от Google для разработки Android-приложений',
    details: [
      'Перейдите на сайт: developer.android.com/studio',
      'Нажмите кнопку "Download Android Studio"',
      'Примите лицензионное соглашение',
      'Скачайте установщик для вашей ОС (Windows / macOS / Linux)',
      'Размер: ~1 ГБ, потребуется ещё ~8 ГБ для SDK'
    ],
    tip: 'Рекомендуется Android Studio Iguana (2023.2.1) или новее'
  },
  {
    number: 2,
    title: 'Установите Android Studio',
    icon: '⚙️',
    description: 'Запустите установщик и следуйте инструкциям',
    details: [
      'Запустите скачанный файл установки',
      'Нажмите "Next" на всех экранах (стандартные настройки)',
      'Выберите компоненты: Android Studio + Android Virtual Device',
      'Укажите папку установки (по умолчанию подходит)',
      'Дождитесь окончания установки',
      'При первом запуске выберите "Standard" установку SDK'
    ],
    tip: 'Убедитесь, что на диске достаточно места (минимум 8 ГБ свободного пространства)'
  },
  {
    number: 3,
    title: 'Первый запуск и настройка SDK',
    icon: '🔧',
    description: 'Android Studio загрузит необходимые компоненты',
    details: [
      'При первом запуске откроется мастер настройки',
      'Выберите "Standard" тип установки',
      'Выберите тему оформления (Darcula — тёмная, рекомендуется)',
      'Дождитесь загрузки Android SDK (~2-5 ГБ)',
      'Дождитесь загрузки эмулятора и системных образов',
      'Нажмите "Finish" после завершения загрузки'
    ],
    tip: 'Первый запуск может занять 10-20 минут — это нормально'
  },
  {
    number: 4,
    title: 'Создайте новый проект',
    icon: '🆕',
    description: 'Создание проекта "RGB Цветомузыка"',
    details: [
      'На главном экране нажмите "New Project"',
      'Выберите шаблон: "Empty Views Activity" (НЕ "Empty Activity" — это Compose!)',
      'Заполните поля:',
      '  • Name: RGB Цветомузыка',
      '  • Package name: com.example.rgbmusic',
      '  • Save location: оставьте по умолчанию',
      '  • Language: Kotlin',
      '  • Minimum SDK: API 26 (Android 8.0)',
      '  • Build configuration language: Kotlin DSL (build.gradle.kts)',
      'Нажмите "Finish"'
    ],
    tip: 'ВАЖНО: Выбирайте именно "Empty Views Activity", а не "Empty Activity" (последний — для Jetpack Compose)'
  },
  {
    number: 5,
    title: 'Дождитесь сборки Gradle',
    icon: '⏳',
    description: 'Первая сборка проекта занимает время',
    details: [
      'После создания проекта Android Studio начнёт синхронизацию Gradle',
      'Внизу появится панель "Build" с прогрессом',
      'Первая сборка может занять 3-10 минут (зависит от интернета)',
      'Gradle скачивает все зависимости из репозиториев',
      'Дождитесь сообщения "BUILD SUCCESSFUL"',
      'Если есть ошибки — проверьте интернет-соединение'
    ],
    tip: 'Не закрывайте Android Studio во время первой сборки!'
  },
  {
    number: 6,
    title: 'Удалите стандартные файлы',
    icon: '🗑️',
    description: 'Удалите сгенерированный код, чтобы заменить нашим',
    details: [
      'В панели "Project" слева раскройте: app → src → main',
      'Откройте java/com/example/rgbmusic/',
      'Удалите файл MainActivity.kt (правый клик → Delete)',
      'Откройте res → layout/',
      'Удалите activity_main.xml и content_main.xml (если есть)',
      'Не удаляйте: AndroidManifest.xml, res/values/, res/mipmap/'
    ],
    tip: 'Можно также удалить папку res/menu/ и res/navigation/ если они есть'
  },
  {
    number: 7,
    title: 'Создайте структуру папок',
    icon: '📁',
    description: 'Создайте необходимые пакеты (папки) для кода',
    details: [
      'В java/com/example/rgbmusic/ создайте папки:',
      '  • adapter/ (для TrackAdapter)',
      '  • data/ (для Track и MusicLibrary)',
      '  • service/ (для MusicService)',
      '  • viewmodel/ (для PlayerViewModel)',
      '',
      'Как создать пакет:',
      '  1. Правый клик на com.example.rgbmusic',
      '  2. New → Package',
      '  3. Введите имя: adapter (или data, service, viewmodel)',
      '  4. Нажмите OK'
    ],
    tip: 'Пакеты в Kotlin/Java — это папки для организации кода'
  },
  {
    number: 8,
    title: 'Скопируйте файлы проекта',
    icon: '📋',
    description: 'Скопируйте код из вкладки "Код проекта" в файлы Android Studio',
    details: [
      'Переключитесь на вкладку "Код проекта" (вверху страницы)',
      'Для каждого файла:',
      '  1. Нажмите на файл в списке слева',
      '  2. Нажмите кнопку "📋 Копировать" на блоке кода',
      '  3. В Android Studio создайте новый файл (правый клик → New → Kotlin Class/File или File)',
      '  4. Укажите точное имя файла (например: Track.kt)',
      '  5. Вставьте скопированный код (Ctrl+V)',
      '  6. Сохраните (Ctrl+S)',
      '',
      'Начните с build.gradle.kts (app), затем AndroidManifest.xml'
    ],
    tip: 'Создавайте файлы в правильных папках! Путь указан под каждым блоком кода.'
  },
  {
    number: 9,
    title: 'Sync Gradle',
    icon: '🔄',
    description: 'Синхронизируйте проект после изменения build.gradle.kts',
    details: [
      'После изменения build.gradle.kts (app):',
      '  • Вверху появится жёлтая полоска "Gradle files have changed"',
      '  • Нажмите "Sync Now"',
      '  • Дождитесь завершения синхронизации',
      '',
      'Или: File → Sync Project with Gradle Files',
      '',
      'Если Sync прошёл — все зависимости (Media3, Coil) скачаны',
      'Если ошибка — проверьте интернет и правильность кода в build.gradle.kts'
    ],
    tip: 'Sync нужно делать каждый раз после изменения build.gradle.kts'
  },
  {
    number: 10,
    title: 'Запустите приложение!',
    icon: '🚀',
    description: 'Запуск на эмуляторе или реальном устройстве',
    details: [
      'Вариант А — Эмулятор:',
      '  1. Tools → Device Manager',
      '  2. "Create Device" → выберите телефон (например Pixel 7)',
      '  3. Выберите системный образ (API 34, Android 14)',
      '  4. Нажмите "Finish", затем ▶ для запуска эмулятора',
      '  5. Дождитесь загрузки эмулятора',
      '',
      'Вариант Б — Реальное устройство:',
      '  1. Включите "Режим разработчика" на телефоне',
      '     (Настройки → О телефоне → 7 раз тапните на "Номер сборки")',
      '  2. Включите "Отладка по USB" в настройках разработчика',
      '  3. Подключите телефон USB-кабелем к компьютеру',
      '  4. Разрешите отладку на телефоне',
      '',
      'Запуск:',
      '  • Выберите устройство в выпадающем списке вверху',
      '  • Нажмите зелёную кнопку ▶ (Run)',
      '  • Дождитесь сборки и установки (~30 секунд)'
    ],
    tip: 'Реальное устройство работает быстрее эмулятора и даёт доступ к реальной музыке'
  }
]

// Тип вкладки
type TabType = 'setup' | 'code'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('setup')
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedStep, setExpandedStep] = useState<number | null>(1)

  const activeFile = projectFiles[activeFileIndex]

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0F0F1A]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎵</span>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  RGB Цветомузыка
                </h1>
                <p className="text-xs text-gray-500">Android App — Шаг 1: Базовый плеер</p>
              </div>
            </div>
          </div>

          {/* Табы */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'setup'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-900/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              🛠️ Как создать проект
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-900/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              💻 Код проекта
            </button>
          </div>
        </div>
      </header>

      {/* Контент вкладки "Как создать проект" */}
      {activeTab === 'setup' && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Заголовок */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">
              🛠️ Как создать проект в Android Studio
            </h2>
            <p className="text-gray-400 text-lg">
              Пошаговая инструкция от установки до первого запуска
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <span className="px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-700/50">
                ~30 минут
              </span>
              <span className="px-3 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-full border border-blue-700/50">
                10 шагов
              </span>
              <span className="px-3 py-1 bg-purple-900/30 text-purple-400 text-xs rounded-full border border-purple-700/50">
                Для новичков
              </span>
            </div>
          </div>

          {/* Требования */}
          <div className="mb-8 p-5 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-xl border border-blue-700/30">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">📋 Что вам понадобится:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Компьютер (Windows 10+, macOS 10.14+, Linux)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Минимум 8 ГБ RAM (рекомендуется 16 ГБ)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                10+ ГБ свободного места на диске
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Интернет-соединение (для загрузки SDK)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Android-телефон ИЛИ мощный ПК (для эмулятора)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                USB-кабель (для подключения телефона)
              </div>
            </div>
          </div>

          {/* Шаги */}
          <div className="space-y-4">
            {setupSteps.map((step) => (
              <div
                key={step.number}
                className={`rounded-xl border transition-all duration-300 ${
                  expandedStep === step.number
                    ? 'bg-gray-800/50 border-pink-500/30 shadow-lg shadow-pink-900/10'
                    : 'bg-gray-800/20 border-gray-700/30 hover:border-gray-600/50'
                }`}
              >
                {/* Заголовок шага */}
                <button
                  onClick={() => setExpandedStep(expandedStep === step.number ? null : step.number)}
                  className="w-full text-left p-5 flex items-start gap-4"
                >
                  {/* Номер шага */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    expandedStep === step.number
                      ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {step.number}
                  </div>

                  {/* Информация */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{step.icon}</span>
                      <h3 className="font-semibold text-lg">{step.title}</h3>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{step.description}</p>
                  </div>

                  {/* Стрелка */}
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 mt-1 ${
                      expandedStep === step.number ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Содержимое шага */}
                {expandedStep === step.number && (
                  <div className="px-5 pb-5 pl-19 ml-14">
                    <div className="border-l-2 border-gray-700 pl-4">
                      <ul className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            {detail.startsWith('  ') ? (
                              <span className="text-pink-400 mt-0.5">→</span>
                            ) : (
                              <span className="text-green-400 mt-0.5">•</span>
                            )}
                            <span className={detail.startsWith('  ') ? 'text-gray-400' : ''}>
                              {detail.trim()}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {step.tip && (
                        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                          <p className="text-sm text-yellow-300">
                            <span className="font-semibold">💡 Совет:</span> {step.tip}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Частые проблемы */}
          <div className="mt-10 p-5 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <h3 className="text-lg font-semibold text-red-400 mb-4">🚨 Частые проблемы и решения</h3>
            <div className="space-y-4">
              <div className="p-3 bg-red-900/10 rounded-lg border border-red-800/20">
                <p className="text-sm font-medium text-red-300">❌ "Gradle sync failed"</p>
                <p className="text-sm text-gray-400 mt-1">→ Проверьте интернет. Попробуйте File → Invalidate Caches → Restart</p>
              </div>
              <div className="p-3 bg-red-900/10 rounded-lg border border-red-800/20">
                <p className="text-sm font-medium text-red-300">❌ "Unresolved reference: media3"</p>
                <p className="text-sm text-gray-400 mt-1">→ Нажмите "Sync Now" вверху. Проверьте, что зависимости добавлены в build.gradle.kts (app)</p>
              </div>
              <div className="p-3 bg-red-900/10 rounded-lg border border-red-800/20">
                <p className="text-sm font-medium text-red-300">❌ "Unresolved reference: R"</p>
                <p className="text-sm text-gray-400 mt-1">→ Build → Clean Project, затем Build → Rebuild Project</p>
              </div>
              <div className="p-3 bg-red-900/10 rounded-lg border border-red-800/20">
                <p className="text-sm font-medium text-red-300">❌ Эмулятор не запускается</p>
                <p className="text-sm text-gray-400 mt-1">→ Включите виртуализацию (VT-x/AMD-V) в BIOS. Или используйте реальное устройство</p>
              </div>
              <div className="p-3 bg-red-900/10 rounded-lg border border-red-800/20">
                <p className="text-sm font-medium text-red-300">❌ "Permission denied" при запуске</p>
                <p className="text-sm text-gray-400 mt-1">→ Разрешите все запрошенные разрешения на устройстве. Проверьте AndroidManifest.xml</p>
              </div>
            </div>
          </div>

          {/* Переход к коду */}
          <div className="mt-8 text-center">
            <button
              onClick={() => setActiveTab('code')}
              className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-pink-900/30 hover:shadow-pink-900/50"
            >
              Перейти к коду проекта →
            </button>
          </div>
        </div>
      )}

      {/* Контент вкладки "Код проекта" */}
      {activeTab === 'code' && (
        <div className="max-w-7xl mx-auto flex">
          {/* Sidebar */}
          <aside
            className={`${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } fixed lg:static top-[73px] left-0 z-40 w-72 lg:w-72 h-[calc(100vh-73px)] lg:h-auto overflow-y-auto bg-[#0F0F1A] lg:bg-transparent border-r border-gray-800 p-4 transition-transform duration-300`}
          >
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
              Файлы проекта ({projectFiles.length})
            </h2>
            <div className="space-y-2">
              {projectFiles.map((file, index) => (
                <FileCard
                  key={file.path}
                  file={file}
                  isActive={index === activeFileIndex}
                  onClick={() => {
                    setActiveFileIndex(index)
                    setSidebarOpen(false)
                  }}
                />
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 p-4 lg:p-8">
            {/* File info */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {activeFile.language === 'kotlin' ? '🟣' : activeFile.language === 'xml' ? '🔵' : '🟢'}
                </span>
                <h2 className="text-2xl font-bold">{activeFile.name}</h2>
              </div>
              <p className="text-gray-400 text-sm mb-1">{activeFile.description}</p>
              <code className="text-xs text-pink-400 bg-pink-900/20 px-2 py-1 rounded">
                📁 {activeFile.path}
              </code>
            </div>

            {/* Code block */}
            <CodeBlock code={activeFile.code} language={activeFile.language} />

            {/* Structure overview */}
            <div className="mt-8 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <h3 className="text-lg font-semibold text-green-400 mb-3">📂 Структура проекта</h3>
              <pre className="text-xs text-gray-400 overflow-x-auto">
{`RGBMusic/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
└── app/
    ├── build.gradle.kts
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/example/rgbmusic/
        │   ├── MainActivity.kt
        │   ├── adapter/
        │   │   └── TrackAdapter.kt
        │   ├── data/
        │   │   ├── Track.kt
        │   │   └── MusicLibrary.kt
        │   ├── service/
        │   │   └── MusicService.kt
        │   └── viewmodel/
        │       └── PlayerViewModel.kt
        └── res/
            ├── layout/
            │   ├── activity_main.xml
            │   └── item_track.xml
            ├── drawable/
            │   ├── ic_music_note.xml
            │   ├── ic_play.xml
            │   ├── ic_pause.xml
            │   ├── ic_skip_next.xml
            │   └── ic_skip_previous.xml
            └── values/
                ├── strings.xml
                └── themes.xml`}
              </pre>
            </div>

            {/* Next step */}
            <div className="mt-6 p-4 bg-gradient-to-r from-pink-900/20 to-purple-900/20 rounded-xl border border-pink-700/30">
              <h3 className="text-lg font-semibold text-pink-400 mb-2">🚀 Шаг 2 — Визуализация БПФ</h3>
              <p className="text-sm text-gray-300">
                После подтверждения работы Шага 1, будет добавлена визуализация аудио через
                быстрое преобразование Фурье (БПФ) с RGB-цветомузыкой.
              </p>
            </div>

            {/* Back to setup */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setActiveTab('setup')}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-all border border-gray-700"
              >
                ← Вернуться к инструкции по созданию проекта
              </button>
            </div>
          </main>
        </div>
      )}

      {/* Overlay for mobile sidebar */}
      {activeTab === 'code' && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
