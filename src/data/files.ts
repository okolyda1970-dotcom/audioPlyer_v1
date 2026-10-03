export interface CodeFile {
  name: string;
  path: string;
  language: string;
  description: string;
  code: string;
}

export const projectFiles: CodeFile[] = [
  {
    name: 'build.gradle.kts (Project)',
    path: 'build.gradle.kts',
    language: 'kotlin',
    description: 'Корневой файл сборки проекта',
    code: `plugins {
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
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.recyclerview:recyclerview:1.3.2")

    // Media3 (ExoPlayer)
    implementation("androidx.media3:media3-exoplayer:1.4.1")
    implementation("androidx.media3:media3-ui:1.4.1")
    implementation("androidx.media3:media3-session:1.4.1")

    // Корутины
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Coil для обложек
    implementation("io.coil-kt:coil:2.6.0")

    // ViewModel и LiveData
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.7.0")
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

    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
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
    description: 'Главная активность — список треков и управление',
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
            mediaController?.let {
                if (it.isPlaying) it.pause() else it.play()
            }
        }
        binding.btnNext.setOnClickListener {
            mediaController?.let {
                if (it.hasNextMediaItem()) {
                    it.seekToNextMediaItem()
                    it.play()
                }
            }
        }
        binding.btnPrev.setOnClickListener {
            mediaController?.let {
                if (it.hasPreviousMediaItem()) {
                    it.seekToPreviousMediaItem()
                    it.play()
                }
            }
        }
    }

    private fun initializePlayer() {
        val sessionToken = SessionToken(
            this, ComponentName(this, MusicService::class.java)
        )
        val future = MediaController.Builder(this, sessionToken).buildAsync()

        future.addListener({
            mediaController = if (future.isDone && !future.isCancelled)
                future.get() else null
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
            if (ContextCompat.checkSelfPermission(this,
                    Manifest.permission.READ_MEDIA_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
            }
            if (ContextCompat.checkSelfPermission(this,
                    Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        } else {
            if (ContextCompat.checkSelfPermission(this,
                    Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }
        return if (permissions.isEmpty()) {
            true
        } else {
            ActivityCompat.requestPermissions(this,
                permissions.toTypedArray(), PERMISSION_REQUEST_CODE)
            false
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int,
        permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE &&
            grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
            initializePlayer()
        }
    }

    override fun onStart() {
        super.onStart()
        if (checkAndRequestPermissions()) {
            val serviceIntent = Intent(this, MusicService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                startForegroundService(serviceIntent)
            else startService(serviceIntent)
        }
    }

    override fun onStop() {
        super.onStop()
        mediaController?.removeListener(playerListener)
    }

    override fun onDestroy() {
        super.onDestroy()
    }
}`
  },
  {
    name: 'MusicService.kt',
    path: 'app/src/main/java/com/example/rgbmusic/service/MusicService.kt',
    language: 'kotlin',
    description: 'Foreground Service для воспроизведения музыки',
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

        val sessionActivityPendingIntent = packageManager
            ?.getLaunchIntentForPackage(packageName)?.let {
                PendingIntent.getActivity(this, 0, it,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            }

        mediaSession = MediaSession.Builder(this, exoPlayer!!)
            .apply {
                sessionActivityPendingIntent?.let { setSessionActivity(it) }
            }
            .build()
    }

    override fun onGetSession(
        controllerInfo: MediaSession.ControllerInfo
    ): MediaSession? = mediaSession

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "music_playback_channel",
                "Воспроизведение музыки",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Канал для уведомлений о воспроизведении"
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
    description: 'Сканер музыкальной библиотеки через MediaStore',
    code: `package com.example.rgbmusic.data

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object MusicLibrary {

    private const val TAG = "MusicLibrary"
    private var cachedTracks: List<Track>? = null

    suspend fun scanMusic(context: Context): List<Track> =
        withContext(Dispatchers.IO) {
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
                MediaStore.Audio.Media.TRACK
            )

            val sortOrder = MediaStore.Audio.Media.ARTIST + " ASC, " +
                    MediaStore.Audio.Media.ALBUM + " ASC"

            val selection = MediaStore.Audio.Media.IS_MUSIC + " != 0" +
                    " AND " + MediaStore.Audio.Media.DURATION + " > 5000"

            context.contentResolver.query(
                collection, projection, selection, null, sortOrder
            )?.use { cursor ->
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
                    val artist = cursor.getString(artistCol) ?: "Неизвестный"
                    val album = cursor.getString(albumCol) ?: "Неизвестный альбом"
                    val albumId = cursor.getLong(albumIdCol)
                    val duration = cursor.getLong(durationCol)
                    val data = cursor.getString(dataCol) ?: ""

                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
                    val albumArtUri = ContentUris.withAppendedId(
                        Uri.parse("content://media/external/audio/albumart"), albumId)

                    tracks.add(Track(id, title, artist, album, albumId,
                        duration, contentUri, data, albumArtUri))
                }
            }

            Log.d(TAG, "Найдено треков: " + tracks.size)
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

class PlayerViewModel : ViewModel() {

    private val _trackList = MutableLiveData<List<Track>>()
    val trackList: LiveData<List<Track>> = _trackList

    private val _currentTrack = MutableLiveData<Track?>()
    val currentTrack: LiveData<Track?> = _currentTrack

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

                mc.setMediaItems(mediaItems,
                    if (trackIndex >= 0) trackIndex else 0, 0L)
                mc.prepare()
                mc.play()
                _currentTrack.postValue(track)
            }
        }
    }

    fun updateCurrentTrackFromMediaItem(mediaItem: MediaItem) {
        val tracks = _trackList.value ?: return
        val track = tracks.find {
            it.uri.toString() == mediaItem.localConfiguration?.uri.toString()
        }
        _currentTrack.postValue(track)
    }

    private suspend fun getMediaController(
        context: Context
    ): MediaController? {
        if (mediaController != null) return mediaController
        return try {
            val sessionToken = SessionToken(context,
                ComponentName(context, MusicService::class.java))
            val future = MediaController.Builder(context, sessionToken)
                .buildAsync()
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

class TrackAdapter(
    private val onTrackClick: (Track) -> Unit
) : ListAdapter<Track, TrackAdapter.TrackViewHolder>(TrackDiffCallback()) {

    override fun onCreateViewHolder(
        parent: ViewGroup, viewType: Int
    ): TrackViewHolder {
        val binding = ItemTrackBinding.inflate(
            LayoutInflater.from(parent.context), parent, false)
        return TrackViewHolder(binding)
    }

    override fun onBindViewHolder(
        holder: TrackViewHolder, position: Int
    ) {
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
        override fun areItemsTheSame(oldItem: Track, newItem: Track) =
            oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: Track, newItem: Track) =
            oldItem == newItem
    }
}`
  },
  {
    name: 'activity_main.xml',
    path: 'app/src/main/res/layout/activity_main.xml',
    language: 'xml',
    description: 'Разметка главной активности',
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

        <ImageView
            android:id="@+id/ivAlbumArt"
            android:layout_width="200dp"
            android:layout_height="200dp"
            android:scaleType="centerCrop"
            android:src="@drawable/ic_music_note" />

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

        <Button
            android:id="@+id/btnPrev"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginHorizontal="8dp"
            android:text="⏮" />

        <Button
            android:id="@+id/btnPlayPause"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="▶" />

        <Button
            android:id="@+id/btnNext"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginHorizontal="8dp"
            android:text="⏭" />
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
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:padding="12dp"
    android:gravity="center_vertical"
    android:background="#16213E"
    android:layout_marginHorizontal="12dp"
    android:layout_marginVertical="4dp">

    <ImageView
        android:id="@+id/ivTrackArt"
        android:layout_width="48dp"
        android:layout_height="48dp"
        android:scaleType="centerCrop"
        android:src="@drawable/ic_music_note" />

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

</LinearLayout>`
  },
  {
    name: 'themes.xml',
    path: 'app/src/main/res/values/themes.xml',
    language: 'xml',
    description: 'Тема приложения',
    code: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.RGBMusic" parent="Theme.Material3.Dark.NoActionBar">
        <item name="colorPrimary">#E94560</item>
        <item name="colorOnPrimary">#FFFFFF</item>
        <item name="colorSecondary">#0F3460</item>
        <item name="android:colorBackground">#1A1A2E</item>
        <item name="colorSurface">#16213E</item>
        <item name="colorOnSurface">#FFFFFF</item>
        <item name="android:statusBarColor">#1A1A2E</item>
        <item name="android:navigationBarColor">#1A1A2E</item>
    </style>
</resources>`
  },
  {
    name: 'strings.xml',
    path: 'app/src/main/res/values/strings.xml',
    language: 'xml',
    description: 'Строковые ресурсы',
    code: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">RGB Цветомузыка</string>
    <string name="play">Воспроизвести</string>
    <string name="pause">Пауза</string>
    <string name="next">Следующий</string>
    <string name="prev">Предыдущий</string>
    <string name="no_tracks">Треки не найдены</string>
</resources>`
  },
  {
    name: 'ic_music_note.xml',
    path: 'app/src/main/res/drawable/ic_music_note.xml',
    language: 'xml',
    description: 'Иконка ноты',
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
    description: 'Иконка Следующий',
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
    description: 'Иконка Предыдущий',
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
    description: 'Настройки проекта',
    code: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
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
    code: `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true`
  }
];
