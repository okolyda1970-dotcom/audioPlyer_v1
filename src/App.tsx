import { useState } from 'react';
import { projectFiles } from './data/files';

function copyToClipboard(text: string) {
  // Fallback для Opera и старых браузеров
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Copy failed:', err);
  }
  document.body.removeChild(textArea);
}

function CodeBlock(props: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(props.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '6px 12px',
          background: copied ? '#10b981' : '#374151',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {copied ? '✓ Скопировано!' : '📋 Копировать'}
      </button>
      <pre
        style={{
          background: '#111827',
          borderRadius: 12,
          padding: 16,
          overflowX: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
          border: '1px solid #374151',
          color: '#e5e7eb',
          fontFamily: 'monospace',
          whiteSpace: 'pre',
          margin: 0,
        }}
      >
        {props.code}
      </pre>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('setup');
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  const activeFile = projectFiles[activeFileIndex];

  const steps = [
    {
      num: 1,
      title: 'Скачайте Android Studio',
      icon: '📥',
      desc: 'Официальная IDE от Google',
      details: [
        'Перейдите на developer.android.com/studio',
        'Нажмите "Download Android Studio"',
        'Примите лицензионное соглашение',
        'Скачайте установщик для вашей ОС',
        'Размер: ~1 ГБ, нужно ещё ~8 ГБ для SDK',
      ],
      tip: 'Рекомендуется Android Studio Iguana (2023.2.1) или новее',
    },
    {
      num: 2,
      title: 'Установите Android Studio',
      icon: '⚙️',
      desc: 'Запустите установщик',
      details: [
        'Запустите скачанный файл',
        'Нажмите "Next" на всех экранах',
        'Выберите: Android Studio + Android Virtual Device',
        'Укажите папку установки (по умолчанию)',
        'При первом запуске выберите "Standard" установку SDK',
      ],
      tip: 'Убедитесь, что на диске минимум 8 ГБ свободного места',
    },
    {
      num: 3,
      title: 'Первый запуск и SDK',
      icon: '🔧',
      desc: 'Загрузка компонентов',
      details: [
        'Откроется мастер настройки',
        'Выберите "Standard" тип установки',
        'Выберите тему Darcula (тёмная)',
        'Дождитесь загрузки Android SDK (~2-5 ГБ)',
        'Дождитесь загрузки эмулятора',
        'Нажмите "Finish"',
      ],
      tip: 'Первый запуск может занять 10-20 минут',
    },
    {
      num: 4,
      title: 'Создайте новый проект',
      icon: '🆕',
      desc: 'Создание проекта RGB Music',
      details: [
        'Нажмите "New Project"',
        'Выберите: "Empty Views Activity" (НЕ "Empty Activity"!)',
        'Заполните поля:',
        '  • Name: RGB Цветомузыка',
        '  • Package name: com.example.rgbmusic',
        '  • Language: Kotlin',
        '  • Minimum SDK: API 26 (Android 8.0)',
        '  • Build config: Kotlin DSL (build.gradle.kts)',
        'Нажмите "Finish"',
      ],
      tip: 'ВАЖНО: "Empty Views Activity", а не "Empty Activity" (последний для Compose)',
    },
    {
      num: 5,
      title: 'Дождитесь сборки Gradle',
      icon: '⏳',
      desc: 'Первая сборка проекта',
      details: [
        'Внизу появится панель "Build" с прогрессом',
        'Первая сборка: 3-10 минут',
        'Gradle скачивает зависимости',
        'Дождитесь "BUILD SUCCESSFUL"',
      ],
      tip: 'Не закрывайте Android Studio во время первой сборки!',
    },
    {
      num: 6,
      title: 'Удалите стандартные файлы',
      icon: '🗑️',
      desc: 'Очистка проекта',
      details: [
        'В панели Project раскройте: app → src → main',
        'Откройте java/com/example/rgbmusic/',
        'Удалите MainActivity.kt (правый клик → Delete)',
        'Откройте res → layout/',
        'Удалите activity_main.xml и content_main.xml',
        'НЕ удаляйте: AndroidManifest.xml, res/values/, res/mipmap/',
      ],
    },
    {
      num: 7,
      title: 'Создайте структуру папок',
      icon: '📁',
      desc: 'Пакеты для кода',
      details: [
        'В java/com/example/rgbmusic/ создайте папки:',
        '  • adapter/',
        '  • data/',
        '  • service/',
        '  • viewmodel/',
        'Как создать: Правый клик → New → Package → введите имя',
      ],
    },
    {
      num: 8,
      title: 'Скопируйте файлы проекта',
      icon: '📋',
      desc: 'Вставьте код из вкладки "Код проекта"',
      details: [
        'Переключитесь на вкладку "Код проекта"',
        'Для каждого файла:',
        '  1. Нажмите на файл в списке',
        '  2. Нажмите "Копировать"',
        '  3. В Android Studio создайте новый файл',
        '  4. Вставьте код (Ctrl+V)',
        '  5. Сохраните (Ctrl+S)',
        'Начните с build.gradle.kts (app)',
      ],
      tip: 'Создавайте файлы в правильных папках! Путь указан под каждым блоком.',
    },
    {
      num: 9,
      title: 'Sync Gradle',
      icon: '🔄',
      desc: 'Синхронизация после изменений',
      details: [
        'После изменения build.gradle.kts:',
        '  • Появится жёлтая полоска "Gradle files have changed"',
        '  • Нажмите "Sync Now"',
        '  • Дождитесь завершения',
        'Или: File → Sync Project with Gradle Files',
      ],
    },
    {
      num: 10,
      title: 'Запустите приложение!',
      icon: '🚀',
      desc: 'Эмулятор или реальное устройство',
      details: [
        'Вариант А — Эмулятор:',
        '  1. Tools → Device Manager',
        '  2. "Create Device" → Pixel 7',
        '  3. Выберите API 34 (Android 14)',
        '  4. Нажмите ▶ для запуска',
        '',
        'Вариант Б — Реальное устройство:',
        '  1. Включите "Режим разработчика"',
        '     (7 раз тапните на "Номер сборки")',
        '  2. Включите "Отладка по USB"',
        '  3. Подключите телефон USB',
        '  4. Разрешите отладку на телефоне',
        '',
        'Запуск: выберите устройство → нажмите ▶ (Run)',
      ],
      tip: 'Реальное устройство быстрее и даёт доступ к реальной музыке',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0F0F1A', color: '#fff' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: '#0F0F1A',
          borderBottom: '1px solid #1f2937',
          padding: '16px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🎵</span>
            <div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  background: 'linear-gradient(to right, #f472b6, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0,
                }}
              >
                RGB Цветомузыка
              </h1>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
                Android App — Шаг 1
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setActiveTab('setup')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background:
                  activeTab === 'setup'
                    ? 'linear-gradient(to right, #059669, #10b981)'
                    : '#1f2937',
                color: activeTab === 'setup' ? '#fff' : '#9ca3af',
              }}
            >
              🛠️ Инструкция
            </button>
            <button
              onClick={() => setActiveTab('code')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background:
                  activeTab === 'code'
                    ? 'linear-gradient(to right, #db2777, #9333ea)'
                    : '#1f2937',
                color: activeTab === 'code' ? '#fff' : '#9ca3af',
              }}
            >
              💻 Код
            </button>
          </div>
        </div>
      </header>

      {/* Setup Tab */}
      {activeTab === 'setup' && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 12 }}>
              🛠️ Как создать проект в Android Studio
            </h2>
            <p style={{ color: '#9ca3af', fontSize: 16 }}>
              Пошаговая инструкция от установки до первого запуска
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginTop: 16,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  padding: '4px 12px',
                  background: 'rgba(16,185,129,0.1)',
                  color: '#10b981',
                  fontSize: 12,
                  borderRadius: 20,
                  border: '1px solid rgba(16,185,129,0.3)',
                }}
              >
                ~30 минут
              </span>
              <span
                style={{
                  padding: '4px 12px',
                  background: 'rgba(59,130,246,0.1)',
                  color: '#3b82f6',
                  fontSize: 12,
                  borderRadius: 20,
                  border: '1px solid rgba(59,130,246,0.3)',
                }}
              >
                10 шагов
              </span>
            </div>
          </div>

          {/* Requirements */}
          <div
            style={{
              marginBottom: 32,
              padding: 20,
              background: 'rgba(59,130,246,0.05)',
              borderRadius: 12,
              border: '1px solid rgba(59,130,246,0.2)',
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#60a5fa', marginBottom: 12 }}>
              📋 Что понадобится:
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 8,
                fontSize: 14,
                color: '#d1d5db',
              }}
            >
              <div>✓ Компьютер (Windows 10+, macOS 10.14+, Linux)</div>
              <div>✓ Минимум 8 ГБ RAM</div>
              <div>✓ 10+ ГБ свободного места</div>
              <div>✓ Интернет-соединение</div>
              <div>✓ Android-телефон или мощный ПК</div>
              <div>✓ USB-кабель (для телефона)</div>
            </div>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step) => {
              const isExpanded = expandedStep === step.num;
              return (
                <div
                  key={step.num}
                  style={{
                    borderRadius: 12,
                    border: isExpanded
                      ? '1px solid rgba(236,72,153,0.3)'
                      : '1px solid #374151',
                    background: isExpanded ? 'rgba(31,41,55,0.5)' : 'rgba(31,41,55,0.2)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : step.num)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 20,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: 18,
                        background: isExpanded
                          ? 'linear-gradient(135deg, #ec4899, #9333ea)'
                          : '#374151',
                        color: isExpanded ? '#fff' : '#9ca3af',
                      }}
                    >
                      {step.num}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{step.icon}</span>
                        <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>
                          {step.title}
                        </h3>
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
                        {step.desc}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 18,
                        color: '#6b7280',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      ▼
                    </span>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px 76px' }}>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {step.details.map((detail, i) => (
                          <li
                            key={i}
                            style={{
                              fontSize: 13,
                              color: detail.startsWith('  ') ? '#9ca3af' : '#d1d5db',
                              padding: '4px 0',
                              paddingLeft: detail.startsWith('  ') ? 16 : 0,
                            }}
                          >
                            {detail.startsWith('  ') ? '→ ' : '• '}
                            {detail.trim()}
                          </li>
                        ))}
                      </ul>
                      {step.tip && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 12,
                            background: 'rgba(234,179,8,0.1)',
                            border: '1px solid rgba(234,179,8,0.2)',
                            borderRadius: 8,
                            fontSize: 13,
                            color: '#fbbf24',
                          }}
                        >
                          💡 {step.tip}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Problems */}
          <div
            style={{
              marginTop: 40,
              padding: 20,
              background: 'rgba(31,41,55,0.3)',
              borderRadius: 12,
              border: '1px solid #374151',
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f87171', marginBottom: 16 }}>
              🚨 Частые проблемы
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  padding: 12,
                  background: 'rgba(239,68,68,0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.15)',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: '#fca5a5', margin: 0 }}>
                  ❌ "Gradle sync failed"
                </p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0 0' }}>
                  → Проверьте интернет. File → Invalidate Caches → Restart
                </p>
              </div>
              <div
                style={{
                  padding: 12,
                  background: 'rgba(239,68,68,0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.15)',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: '#fca5a5', margin: 0 }}>
                  ❌ "Unresolved reference: media3"
                </p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0 0' }}>
                  → Нажмите "Sync Now". Проверьте build.gradle.kts
                </p>
              </div>
              <div
                style={{
                  padding: 12,
                  background: 'rgba(239,68,68,0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.15)',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: '#fca5a5', margin: 0 }}>
                  ❌ Эмулятор не запускается
                </p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0 0' }}>
                  → Включите виртуализацию (VT-x) в BIOS. Или используйте телефон
                </p>
              </div>
            </div>
          </div>

          {/* Go to code */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button
              onClick={() => setActiveTab('code')}
              style={{
                padding: '14px 32px',
                background: 'linear-gradient(to right, #db2777, #9333ea)',
                color: '#fff',
                fontWeight: 600,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
              }}
            >
              Перейти к коду проекта →
            </button>
          </div>
        </div>
      )}

      {/* Code Tab */}
      {activeTab === 'code' && (
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            gap: 0,
          }}
        >
          {/* Sidebar */}
          <aside
            style={{
              width: 280,
              minWidth: 280,
              height: 'calc(100vh - 73px)',
              overflowY: 'auto',
              padding: 16,
              borderRight: '1px solid #1f2937',
              position: 'sticky',
              top: 73,
            }}
          >
            <h2
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 12,
                padding: '0 8px',
              }}
            >
              Файлы ({projectFiles.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {projectFiles.map((file, index) => (
                <button
                  key={file.path}
                  onClick={() => setActiveFileIndex(index)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border:
                      index === activeFileIndex
                        ? '1px solid rgba(236,72,153,0.5)'
                        : '1px solid transparent',
                    background:
                      index === activeFileIndex
                        ? 'rgba(236,72,153,0.1)'
                        : 'transparent',
                    color: index === activeFileIndex ? '#fff' : '#9ca3af',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 14 }}>
                    {file.language === 'kotlin'
                      ? '🟣'
                      : file.language === 'xml'
                      ? '🔵'
                      : '🟢'}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {file.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#6b7280',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {file.path}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Main */}
          <main style={{ flex: 1, minWidth: 0, padding: '24px 32px' }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>
                  {activeFile.language === 'kotlin'
                    ? '🟣'
                    : activeFile.language === 'xml'
                    ? '🔵'
                    : '🟢'}
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 'bold', margin: 0 }}>{activeFile.name}</h2>
              </div>
              <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>
                {activeFile.description}
              </p>
              <code
                style={{
                  fontSize: 12,
                  color: '#f472b6',
                  background: 'rgba(236,72,153,0.1)',
                  padding: '4px 8px',
                  borderRadius: 4,
                }}
              >
                📁 {activeFile.path}
              </code>
            </div>

            <CodeBlock code={activeFile.code} />

            {/* Structure */}
            <div
              style={{
                marginTop: 32,
                padding: 16,
                background: 'rgba(31,41,55,0.3)',
                borderRadius: 12,
                border: '1px solid #374151',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#34d399', marginBottom: 12 }}>
                📂 Структура проекта
              </h3>
              <pre
                style={{
                  fontSize: 11,
                  color: '#9ca3af',
                  overflowX: 'auto',
                  margin: 0,
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                }}
              >
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
            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: 'rgba(236,72,153,0.05)',
                borderRadius: 12,
                border: '1px solid rgba(236,72,153,0.2)',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f472b6', marginBottom: 8 }}>
                🚀 Шаг 2 — Визуализация БПФ
              </h3>
              <p style={{ fontSize: 13, color: '#d1d5db', margin: 0 }}>
                После подтверждения работы Шага 1, будет добавлена визуализация аудио через БПФ с
                RGB-цветомузыкой.
              </p>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
