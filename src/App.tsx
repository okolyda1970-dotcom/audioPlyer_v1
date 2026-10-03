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
    <!-- Для Android 13+ (API 33+) -->
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <!-- Для Android 12 и ниже (API 32 и ниже) -->
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
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.RGBMusic"
        tools:targetApi="31">

        <!-- Главная активность -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.RGBMusic">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Музыкальный сервис (Foreground Service) -->
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
import android.content.Context
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
import com.example.rgbmusic.adapter.TrackAdapter
import com.example.rgbmusic.databinding.ActivityMainBinding
import com.example.rgbmusic.service.MusicService
import com.example.rgbmusic.viewmodel.PlayerViewModel
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors

/**
 * Главная активность приложения "RGB Цветомузыка"
 * 
 * Отвечает за:
 * - Запрос разрешений на доступ к аудио
 * - Отображение списка треков (RecyclerView)
 * - Управление воспроизведением (Play/Pause, Next, Prev)
 * - Отображение прогресса и информации о текущем треке
 */
class MainActivity : AppCompatActivity() {

    // ViewBinding для безопасного доступа к View
    private lateinit var binding: ActivityMainBinding

    // ViewModel для управления состоянием плеера
    private val viewModel: PlayerViewModel by viewModels()

    // Future для подключения к MusicService через MediaController
    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var mediaController: MediaController? = null

    // Адаптер для RecyclerView со списком треков
    private lateinit var trackAdapter: TrackAdapter

    companion object {
        // Код запроса разрешений
        private const val PERMISSION_REQUEST_CODE = 100
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Инициализация ViewBinding
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Инициализация UI
        setupRecyclerView()
        setupPlayerControls()

        // Запрос разрешений
        if (checkAndRequestPermissions()) {
            // Разрешения уже есть — инициализируем плеер
            initializePlayer()
        }
    }

    /**
     * Настройка RecyclerView со списком треков
     */
    private fun setupRecyclerView() {
        trackAdapter = TrackAdapter { track ->
            // Клик по треку — воспроизведение
            viewModel.playTrack(this, track)
        }

        binding.recyclerViewTracks.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = trackAdapter
        }
    }

    /**
     * Настройка кнопок управления воспроизведением
     */
    private fun setupPlayerControls() {
        // Кнопка Play/Pause
        binding.btnPlayPause.setOnClickListener {
            mediaController?.let { controller ->
                if (controller.isPlaying) {
                    controller.pause()
                } else {
                    controller.play()
                }
            }
        }

        // Кнопка "Следующий трек"
        binding.btnNext.setOnClickListener {
            mediaController?.let { controller ->
                if (controller.hasNextMediaItem()) {
                    controller.seekToNextMediaItem()
                    controller.play()
                }
            }
        }

        // Кнопка "Предыдущий трек"
        binding.btnPrev.setOnClickListener {
            mediaController?.let { controller ->
                if (controller.hasPreviousMediaItem()) {
                    controller.seekToPreviousMediaItem()
                    controller.play()
                }
            }
        }
    }

    /**
     * Инициализация MediaController и подключение к MusicService
     */
    private fun initializePlayer() {
        // Создаём SessionToken для подключения к MusicService
        val sessionToken = SessionToken(
            this,
            ComponentName(this, MusicService::class.java)
        )

        // Создаём MediaController асинхронно
        controllerFuture = MediaController.Builder(this, sessionToken)
            .buildAsync()

        controllerFuture?.addListener({
            mediaController = controllerFuture?.let {
                if (it.isDone && !it.isCancelled) it.get() else null
            }

            // Подключаем слушатель для обновления UI
            mediaController?.addListener(playerListener)

            // Загружаем список треков
            viewModel.loadTracks(this)

            // Наблюдаем за изменениями списка треков
            viewModel.trackList.observe(this) { tracks ->
                trackAdapter.submitList(tracks)
            }

            // Наблюдаем за текущим треком
            viewModel.currentTrack.observe(this) { track ->
                track?.let {
                    binding.tvTrackTitle.text = it.title
                    binding.tvTrackArtist.text = it.artist
                    // Загрузка обложки через Coil
                    loadAlbumArt(it.albumId)
                }
            }

        }, MoreExecutors.directExecutor())
    }

    /**
     * Загрузка обложки альбома через Coil
     */
    private fun loadAlbumArt(albumId: Long) {
        // Формируем URI для обложки из MediaStore
        val albumUri = android.content.ContentUris.withAppendedId(
            android.provider.MediaStore.Audio.Albums.EXTERNAL_CONTENT_URI,
            albumId
        )

        coil.load(binding.ivAlbumArt) {
            data(albumUri)
            placeholder(R.drawable.ic_music_note)
            error(R.drawable.ic_music_note)
        }
    }

    /**
     * Слушатель событий плеера для обновления UI
     */
    private val playerListener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            // Обновляем иконку кнопки Play/Pause
            if (isPlaying) {
                binding.btnPlayPause.setImageResource(R.drawable.ic_pause)
            } else {
                binding.btnPlayPause.setImageResource(R.drawable.ic_play)
            }
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            // При смене трека обновляем информацию
            mediaItem?.let {
                viewModel.updateCurrentTrackFromMediaItem(it)
            }
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            when (playbackState) {
                Player.STATE_BUFFERING -> {
                    binding.progressBar.max = 100
                    binding.progressBar.isIndeterminate = true
                }
                Player.STATE_READY -> {
                    binding.progressBar.isIndeterminate = false
                }
                else -> {}
            }
        }
    }

    /**
     * Проверка и запрос необходимых разрешений
     * @return true если все разрешения уже предоставлены
     */
    private fun checkAndRequestPermissions(): Boolean {
        val permissions = mutableListOf<String>()

        // Для Android 13+ запрашиваем READ_MEDIA_AUDIO
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this, Manifest.permission.READ_MEDIA_AUDIO
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
            }
            // Запрашиваем разрешение на уведомления
            if (ContextCompat.checkSelfPermission(
                    this, Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        } else {
            // Для Android 12 и ниже запрашиваем READ_EXTERNAL_STORAGE
            if (ContextCompat.checkSelfPermission(
                    this, Manifest.permission.READ_EXTERNAL_STORAGE
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }

        return if (permissions.isEmpty()) {
            true // Все разрешения уже есть
        } else {
            ActivityCompat.requestPermissions(
                this,
                permissions.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
            false
        }
    }

    /**
     * Обработка результата запроса разрешений
     */
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                // Все разрешения предоставлены — инициализируем плеер
                initializePlayer()
            } else {
                Toast.makeText(
                    this,
                    "Для работы приложения необходим доступ к аудиофайлам",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    /**
     * Запуск MusicService при старте приложения
     */
    private fun startMusicService() {
        val serviceIntent = Intent(this, MusicService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    override fun onStart() {
        super.onStart()
        // Запускаем сервис при старте активности
        if (checkAndRequestPermissions()) {
            startMusicService()
        }
    }

    override fun onStop() {
        super.onStop()
        // Отключаем слушатель при остановке
        mediaController?.removeListener(playerListener)
    }

    override fun onDestroy() {
        super.onDestroy()
        // Освобождаем ресурсы MediaController
        controllerFuture?.let {
            MediaController.releaseFuture(it)
        }
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
import android.content.Intent
import android.os.Build
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * Музыкальный сервис на базе Media3 MediaSessionService
 * 
 * Этот сервис:
 * - Работает как Foreground Service (не убивается системой)
 * - Создаёт ExoPlayer для воспроизведения
 * - Создаёт MediaSession для управления из уведомления и внешних клиентов
 * - Показывает уведомление с кнопками управления (Play/Pause/Next/Prev)
 */
class MusicService : MediaSessionService() {

    // ExoPlayer — основной движок воспроизведения
    private var exoPlayer: ExoPlayer? = null

    // MediaSession — связывает ExoPlayer с UI и уведомлениями
    private var mediaSession: MediaSession? = null

    override fun onCreate() {
        super.onCreate()

        // Создаём канал уведомлений (обязательно для Android 8+)
        createNotificationChannel()

        // Инициализация ExoPlayer
        exoPlayer = ExoPlayer.Builder(this)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .setUsage(C.USAGE_MEDIA)
                    .build(),
                true // handleAudioFocus — управлять аудиофокусом автоматически
            )
            .setHandleAudioBecomingNoisy(true) // пауза при отключении наушников
            .build()

        // Создаём MediaSession с PendingIntent для уведомления
        val sessionActivityPendingIntent = packageManager?.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(
                this,
                0,
                it,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        }

        // Создаём MediaSession
        mediaSession = MediaSession.Builder(this, exoPlayer!!)
            .apply {
                sessionActivityPendingIntent?.let {
                    setSessionActivity(it)
                }
            }
            .build()
    }

    /**
     * Вызывается при подключении клиента (MediaController)
     * @return MediaSession для управления
     */
    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    /**
     * Создание канала уведомлений для Android 8+
     */
    private fun createNotificationChannel() {
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

        // Создаём канал только если его ещё нет
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "music_playback_channel",
                "Воспроизведение музыки",
                NotificationManager.IMPORTANCE_LOW // Низкая важность — без звука
            ).apply {
                description = "Канал для уведомлений о воспроизведении музыки"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Очистка ресурсов при уничтожении сервиса
     */
    override fun onDestroy() {
        // Освобождаем MediaSession
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
 * 
 * Использует MediaStore.Audio.Media для получения списка треков.
 * Поддерживает кэширование результатов для ускорения повторных запросов.
 */
object MusicLibrary {

    private const val TAG = "MusicLibrary"

    // Кэш списка треков (чтобы не сканировать каждый раз)
    private var cachedTracks: List<Track>? = null

    /**
     * Сканирует устройство и возвращает список музыкальных треков
     * 
     * @param context контекст приложения
     * @return список объектов Track
     */
    suspend fun scanMusic(context: Context): List<Track> = withContext(Dispatchers.IO) {
        // Если кэш есть — возвращаем его
        cachedTracks?.let { return@withContext it }

        val tracks = mutableListOf<Track>()

        // URI для доступа к аудиофайлам через MediaStore
        val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI

        // Какие поля мы запрашиваем
        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DATA, // Путь к файлу
            MediaStore.Audio.Media.TRACK, // Номер трека
            MediaStore.Audio.Media.SIZE
        )

        // Сортировка по имени исполнителя, затем по альбому
        val sortOrder = "\${MediaStore.Audio.Media.ARTIST} ASC, " +
                "\${MediaStore.Audio.Media.ALBUM} ASC, " +
                "\${MediaStore.Audio.Media.TRACK} ASC"

        // Фильтр: только аудиофайлы (исключаем подкасты, рингтоны и т.д.)
        val selection = "\${MediaStore.Audio.Media.IS_MUSIC} != 0" +
                " AND \${MediaStore.Audio.Media.DURATION} > 5000" // Минимум 5 секунд

        // Выполняем запрос к ContentResolver
        context.contentResolver.query(
            collection,
            projection,
            selection,
            null,
            sortOrder
        )?.use { cursor ->
            // Получаем индексы колонок для быстрого доступа
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
            val titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
            val artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
            val albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
            val albumIdColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
            val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
            val dataColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)

            // Перебираем все результаты
            while (cursor.moveToNext()) {
                val id = cursor.getLong(idColumn)
                val title = cursor.getString(titleColumn) ?: "Неизвестный трек"
                val artist = cursor.getString(artistColumn) ?: "Неизвестный исполнитель"
                val album = cursor.getString(albumColumn) ?: "Неизвестный альбом"
                val albumId = cursor.getLong(albumIdColumn)
                val duration = cursor.getLong(durationColumn)
                val data = cursor.getString(dataColumn) ?: ""

                // Формируем URI для воспроизведения
                val contentUri = ContentUris.withAppendedId(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    id
                )

                // Формируем URI для обложки альбома
                val albumArtUri = ContentUris.withAppendedId(
                    Uri.parse("content://media/external/audio/albumart"),
                    albumId
                )

                // Создаём объект Track
                val track = Track(
                    id = id,
                    title = title,
                    artist = artist,
                    album = album,
                    albumId = albumId,
                    duration = duration,
                    uri = contentUri,
                    filePath = data,
                    albumArtUri = albumArtUri
                )

                tracks.add(track)
            }
        }

        Log.d(TAG, "Найдено треков: \${tracks.size}")

        // Сохраняем в кэш
        cachedTracks = tracks

        tracks
    }

    /**
     * Очищает кэш (например, при обновлении библиотеки)
     */
    fun clearCache() {
        cachedTracks = null
    }
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
 * 
 * @param id Уникальный идентификатор трека (из MediaStore)
 * @param title Название трека
 * @param artist Исполнитель
 * @param album Название альбома
 * @param albumId ID альбома (для загрузки обложки)
 * @param duration Длительность в миллисекундах
 * @param uri URI для воспроизведения через ExoPlayer
 * @param filePath Путь к файлу на устройстве
 * @param albumArtUri URI для загрузки обложки альбома
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

    /**
     * Форматирование длительности в строку (мм:сс)
     */
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
import com.google.common.util.concurrent.MoreExecutors
import kotlinx.coroutines.launch

/**
 * ViewModel для управления состоянием плеера
 * 
 * Связывает UI (MainActivity) с MusicService через MediaController.
 * Обновляет UI при смене трека, прогресса и состояния воспроизведения.
 */
class PlayerViewModel : ViewModel() {

    // Список всех треков (LiveData для наблюдения из UI)
    private val _trackList = MutableLiveData<List<Track>>()
    val trackList: LiveData<List<Track>> = _trackList

    // Текущий воспроизводимый трек
    private val _currentTrack = MutableLiveData<Track?>()
    val currentTrack: LiveData<Track?> = _currentTrack

    // Состояние воспроизведения (играет/пауза)
    private val _isPlaying = MutableLiveData(false)
    val isPlaying: LiveData<Boolean> = _isPlaying

    // Текущая позиция воспроизведения (мс)
    private val _currentPosition = MutableLiveData(0L)
    val currentPosition: LiveData<Long> = _currentPosition

    // Длительность текущего трека (мс)
    private val _duration = MutableLiveData(0L)
    val duration: LiveData<Long> = _duration

    // MediaController для управления сервисом
    private var mediaController: MediaController? = null

    /**
     * Загрузка списка треков из MediaStore
     */
    fun loadTracks(context: Context) {
        viewModelScope.launch {
            val tracks = MusicLibrary.scanMusic(context)
            _trackList.postValue(tracks)
        }
    }

    /**
     * Воспроизведение конкретного трека
     * 
     * @param context контекст для подключения к сервису
     * @param track трек для воспроизведения
     */
    fun playTrack(context: Context, track: Track) {
        viewModelScope.launch {
            // Получаем MediaController
            val controller = getMediaController(context)
            controller?.let { mc ->
                // Создаём MediaItem из URI трека
                val mediaItem = MediaItem.fromUri(track.uri)

                // Добавляем все треки в плейлист
                val allTracks = _trackList.value ?: emptyList()
                val mediaItems = allTracks.map { MediaItem.fromUri(it.uri) }

                // Находим индекс выбранного трека
                val trackIndex = allTracks.indexOfFirst { it.id == track.id }

                // Устанавливаем плейлист и начинаем воспроизведение
                mc.setMediaItems(mediaItems, trackIndex.coerceAtLeast(0), 0L)
                mc.prepare()
                mc.play()

                // Обновляем текущий трек
                _currentTrack.postValue(track)
            }
        }
    }

    /**
     * Обновление текущего трека при переходе MediaItem
     */
    fun updateCurrentTrackFromMediaItem(mediaItem: MediaItem) {
        val tracks = _trackList.value ?: return
        // Находим трек по URI
        val track = tracks.find { it.uri.toString() == mediaItem.localConfiguration?.uri.toString() }
        _currentTrack.postValue(track)
    }

    /**
     * Получение MediaController (подключение к MusicService)
     */
    private suspend fun getMediaController(context: Context): MediaController? {
        if (mediaController != null) return mediaController

        return try {
            val sessionToken = SessionToken(
                context,
                ComponentName(context, MusicService::class.java)
            )

            val future = MediaController.Builder(context, sessionToken).buildAsync()

            // Ждём результат
            val controller = future.get()
            mediaController = controller
            controller
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Форматирование позиции в строку (мм:сс)
     */
    fun formatTime(millis: Long): String {
        val totalSeconds = millis / 1000
        val minutes = totalSeconds / 60
        val seconds = totalSeconds % 60
        return String.format("%d:%02d", minutes, seconds)
    }

    override fun onCleared() {
        super.onCleared()
        // Освобождаем контроллер
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
 * 
 * Использует ListAdapter с DiffUtil для эффективного обновления списка.
 */
class TrackAdapter(
    private val onTrackClick: (Track) -> Unit
) : ListAdapter<Track, TrackAdapter.TrackViewHolder>(TrackDiffCallback()) {

    /**
     * Создание ViewHolder
     */
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TrackViewHolder {
        val binding = ItemTrackBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return TrackViewHolder(binding)
    }

    /**
     * Привязка данных к ViewHolder
     */
    override fun onBindViewHolder(holder: TrackViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    /**
     * ViewHolder для одного элемента списка треков
     */
    inner class TrackViewHolder(
        private val binding: ItemTrackBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(track: Track) {
            // Название трека
            binding.tvTrackTitle.text = track.title

            // Исполнитель
            binding.tvTrackArtist.text = track.artist

            // Длительность
            binding.tvDuration.text = track.formattedDuration()

            // Обложка альбома через Coil
            binding.ivTrackArt.load(track.albumArtUri) {
                placeholder(R.drawable.ic_music_note)
                error(R.drawable.ic_music_note)
            }

            // Обработка клика
            binding.root.setOnClickListener {
                onTrackClick(track)
            }
        }
    }

    /**
     * DiffUtil для эффективного сравнения элементов списка
     */
    class TrackDiffCallback : DiffUtil.ItemCallback<Track>() {
        override fun areItemsTheSame(oldItem: Track, newItem: Track): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Track, newItem: Track): Boolean {
            return oldItem == newItem
        }
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

    <!-- Верхняя панель с информацией о текущем треке -->
    <LinearLayout
        android:id="@+id/layoutNowPlaying"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="16dp"
        android:gravity="center"
        app:layout_constraintTop_toTopOf="parent">

        <!-- Обложка альбома -->
        <com.google.android.material.imageview.ShapeableImageView
            android:id="@+id/ivAlbumArt"
            android:layout_width="200dp"
            android:layout_height="200dp"
            android:scaleType="centerCrop"
            android:src="@drawable/ic_music_note"
            app:shapeAppearanceOverlay="@style/RoundedImageView"
            android:contentDescription="Обложка альбома" />

        <!-- Название трека -->
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

        <!-- Исполнитель -->
        <TextView
            android:id="@+id/tvTrackArtist"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:text="—"
            android:textColor="#AAAAAA"
            android:textSize="16sp"
            android:maxLines="1"
            android:ellipsize="end" />

    </LinearLayout>

    <!-- Прогресс-бар воспроизведения -->
    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginHorizontal="24dp"
        android:layout_marginTop="8dp"
        android:progressTint="#E94560"
        android:progressBackgroundTint="#333355"
        app:layout_constraintTop_toBottomOf="@id/layoutNowPlaying" />

    <!-- Кнопки управления воспроизведением -->
    <LinearLayout
        android:id="@+id/layoutControls"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center"
        android:padding="16dp"
        app:layout_constraintTop_toBottomOf="@id/progressBar">

        <!-- Кнопка "Предыдущий" -->
        <com.google.android.material.floatingactionbutton.FloatingActionButton
            android:id="@+id/btnPrev"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginHorizontal="16dp"
            android:src="@drawable/ic_skip_previous"
            android:contentDescription="Предыдущий трек"
            app:fabSize="mini"
            app:backgroundTint="#16213E"
            app:tint="#FFFFFF" />

        <!-- Кнопка Play/Pause -->
        <com.google.android.material.floatingactionbutton.FloatingActionButton
            android:id="@+id/btnPlayPause"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:src="@drawable/ic_play"
            android:contentDescription="Воспроизведение / Пауза"
            app:fabSize="normal"
            app:backgroundTint="#E94560"
            app:tint="#FFFFFF" />

        <!-- Кнопка "Следующий" -->
        <com.google.android.material.floatingactionbutton.FloatingActionButton
            android:id="@+id/btnNext"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginHorizontal="16dp"
            android:src="@drawable/ic_skip_next"
            android:contentDescription="Следующий трек"
            app:fabSize="mini"
            app:backgroundTint="#16213E"
            app:tint="#FFFFFF" />

    </LinearLayout>

    <!-- Разделитель -->
    <View
        android:id="@+id/divider"
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:background="#333355"
        android:layout_marginHorizontal="16dp"
        app:layout_constraintTop_toBottomOf="@id/layoutControls" />

    <!-- Список треков -->
    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/recyclerViewTracks"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_marginTop="8dp"
        android:clipToPadding="false"
        android:paddingBottom="16dp"
        app:layout_constraintTop_toBottomOf="@id/divider"
        app:layout_constraintBottom_toBottomOf="parent"
        tools:listitem="@layout/item_track" />

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

        <!-- Обложка трека -->
        <com.google.android.material.imageview.ShapeableImageView
            android:id="@+id/ivTrackArt"
            android:layout_width="48dp"
            android:layout_height="48dp"
            android:scaleType="centerCrop"
            android:src="@drawable/ic_music_note"
            app:shapeAppearanceOverlay="@style/RoundedImageViewSmall"
            android:contentDescription="Обложка трека" />

        <!-- Информация о треке -->
        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:layout_marginStart="12dp">

            <!-- Название -->
            <TextView
                android:id="@+id/tvTrackTitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textColor="#FFFFFF"
                android:textSize="16sp"
                android:textStyle="bold"
                android:maxLines="1"
                android:ellipsize="end" />

            <!-- Исполнитель -->
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

        <!-- Длительность -->
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

    <!-- Основная тема приложения -->
    <style name="Theme.RGBMusic" parent="Theme.Material3.Dark.NoActionBar">
        <!-- Основные цвета -->
        <item name="colorPrimary">#E94560</item>
        <item name="colorPrimaryVariant">#C73E54</item>
        <item name="colorOnPrimary">#FFFFFF</item>
        <item name="colorSecondary">#0F3460</item>
        <item name="colorOnSecondary">#FFFFFF</item>

        <!-- Фон -->
        <item name="android:colorBackground">#1A1A2E</item>
        <item name="colorSurface">#16213E</item>
        <item name="colorOnSurface">#FFFFFF</item>

        <!-- Статус-бар -->
        <item name="android:statusBarColor">#1A1A2E</item>
        <item name="android:navigationBarColor">#1A1A2E</item>
    </style>

    <!-- Скруглённая обложка альбома (большая) -->
    <style name="RoundedImageView" parent="">
        <item name="cornerFamily">rounded</item>
        <item name="cornerSize">16dp</item>
    </style>

    <!-- Скруглённая обложка трека (маленькая) -->
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
        <code className={`language-${language} text-gray-100`}>
          {code}
        </code>
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

export default function App() {
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const activeFile = projectFiles[activeFileIndex]

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0F0F1A]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
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
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-700/50">
              Kotlin
            </span>
            <span className="hidden sm:inline-block px-3 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-full border border-blue-700/50">
              Media3
            </span>
            <span className="hidden sm:inline-block px-3 py-1 bg-purple-900/30 text-purple-400 text-xs rounded-full border border-purple-700/50">
              SDK 26–34
            </span>
          </div>
        </div>
      </header>

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

          {/* Info section */}
          <div className="mt-8 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <h3 className="text-lg font-semibold text-yellow-400 mb-3">⚠️ Инструкция по использованию</h3>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Создайте новый проект в Android Studio (Empty Activity, Kotlin)</li>
              <li>Скопируйте каждый файл в соответствующую директорию проекта</li>
              <li>Убедитесь, что структура папок совпадает с путями файлов</li>
              <li>Sync Gradle (File → Sync Project with Gradle Files)</li>
              <li>Запустите на устройстве или эмуляторе с Android 8.0+</li>
            </ol>
          </div>

          {/* Structure overview */}
          <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
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
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
