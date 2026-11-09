# Site translation glossary

English (`en.json`) is the source. Every other dictionary mirrors its keys exactly;
`npm run verify:i18n` (scripts/check-i18n.mjs) enforces keys, `{placeholders}`, `<tags>`,
plural forms, list lengths and brand names. None of these translations has been reviewed by a
native speaker yet.

## Never translated

Written exactly as in English, in every language and every grammatical case:

- **OPEN//77**, **Open77**, **Open2077** (the platform), **NCWE** and **NCWE Studio**,
  **Workshop**, **Warden**, **Discord**, **GitHub**, **WolvenKit**, **ArchiveXL**, **RED4ext**.
- **Cyberpunk 2077**, **Night City** (kept in Latin script, Russian and Thai included, as on
  the rest of the platform), **CD PROJEKT RED**, **REDengine**. Japanese is the exception: it
  follows CD PROJEKT RED's Japanese edition, **サイバーパンク2077** and **ナイトシティ** (the
  validator requires them), and keeps the Latin marks only in the footer's trademark sentence.
- **Phantom Liberty** follows CD PROJEKT RED's own release titles, as in the launcher:
  Polish _Widmo wolności_, Russian _Призрачная свобода_, Japanese _仮初めの自由_, every other
  language _Phantom Liberty_.
- **Open Alpha**: the name of the programme, matching the English-only guide it links to.
- Code, file names, commands, environment variables, URLs, version numbers, and terminal-style
  labels such as `// NETWORK.SIGNAL` (the words after them are translated).
- Units are written the way the language writes them, as in the launcher: French `Ko Mo Go`
  (`Kio` for KiB), Russian `мс КБ МБ ГБ` (`КиБ`), `ms`/`MB` elsewhere; short time units follow
  the language (`il y a 5 s`, `5 с назад`, `5分前`, `5 นาทีที่แล้ว`, Thai `ชม.` for hours).
  Sizes and durations the code measures are formatted by the code.
- Whatever a server operator wrote (server names, descriptions, tags) and anything the master
  server returns that has no translated code.

## How messages work

- `{name}` is filled by the code. Keep every placeholder, move it wherever the sentence needs it.
- `<tag>…</tag>` wraps a run the code renders (a link, bold, a key). Keep every tag pair and its
  name; the words inside are yours. Tags never nest.
- Plurals are objects: English has `one` and `other`; Polish and Russian also need `few` and
  `many`; Japanese and Thai have no grammatical plural and write `other` only, with a counter
  where the language needs one (`{count}台のサーバー`, `ผู้เล่นออนไลน์ {count} คน`). `{count}` is
  formatted for the language by the code.
- A display title is an array of lines (`["Run your own", "Night City"]`) with `accent` listing
  the highlighted line(s) by index. Split the translation into as many lines as reads best and
  update `accent` so it still points at the emphasised words. Japanese and Thai put no space
  between words, so a line break is the only word boundary such a title has: never split inside
  a word, and never start a Thai line with a vowel or tone mark. (The page joins a title's lines
  with a space; the Japanese stylesheet hides it.)
- Lists of cards, steps, questions and facts keep the English length and order: the code pairs
  them with icons and links by position.
- ` ` (no-break space) joins words that must not wrap apart, e.g. `Cyberpunk 2077`.
- Capitals: write text in normal case. Where the design shows capitals, CSS or the code
  uppercases it with the page language (Turkish dotted İ is handled).

## Tone

Second person, direct, the voice of a game platform talking to players and modders: short
sentences, no marketing superlatives, no corporate formality, and plain technical terms where a
modder would use them. Labels, tabs, buttons and navigation stay short; German and Russian
versions aim at no more than about 30 % over the English length there.

| Language | Address | Quotation marks |
|---|---|---|
| fr | _vous_ | « … » with no-break spaces; no-break space before `: ; ? !` |
| es | _tú_ | « … » |
| pt-BR | _você_ | “ … ” |
| de | _du_ (lowercase) | „ … “ |
| pl | _ty_ (informal) | „ … ” |
| ru | _вы_ (lowercase) | « … » |
| tr | _sen_ | “ … ” |
| ja | です・ます in sentences, no pronoun; buttons and labels as noun phrases or plain verbs | 「 … 」 (『 … 』 inside them); full-width `、。！？：（）` |
| th | polite and neutral, no ครับ/ค่ะ; คุณ only where a sentence needs a subject | “ … ” |

Spacing in the two languages without spaces between words: Japanese puts no space between
Japanese and Latin text or digits (`Open77のサーバー`, `5分前`, `8～128文字`). Thai separates
phrases and sentences with a space and no full stop, puts a space on each side of an embedded
Latin word, number or Latin placeholder (`เล่น Cyberpunk 2077 กับเพื่อน`), and never one inside a
Thai word.

Dates: Thai dates use the Gregorian calendar (`th-u-ca-gregory` in `LOCALE_INFO.intl`:
_8 พ.ย. 2026_) rather than the Buddhist era that `th` defaults to, as Thai gaming and software
sites do and as every other date on the platform reads. Worth a native check.

## Platform terms

Per-language choices made by the translators; game terms follow CD PROJEKT RED's official
localization of Cyberpunk 2077 where the game has the word. Where the launcher's glossary
(`Open77.Launcher/web/i18n/GLOSSARY.md` in the launcher repository) already has a term, the
site uses the same word, so a player reads one vocabulary in both. Japanese game vocabulary
follows the Japanese edition (フィクサー, ネットランナー, リッパードク) and writes MOD in capitals, as
Japanese PC players do. The game has no Thai localization: Thai follows the words Thai players
and gaming sites use, with proper nouns and product names in Latin script.

| English | fr | es | pt-BR | de | pl | ru | tr | ja | th |
|---|---|---|---|---|---|---|---|---|---|
| launcher | launcher | launcher | launcher | Launcher | launcher | лаунчер | başlatıcı | ランチャー | ลันเชอร์ |
| server browser | liste des serveurs | explorador de servidores | lista de servidores | Serverliste | lista serwerów | список серверов | sunucu listesi | サーバーブラウザー | รายการเซิร์ฟเวอร์ |
| directory | annuaire | directorio | diretório | Serververzeichnis | katalog | каталог | sunucu dizini | サーバーディレクトリ | ไดเรกทอรีเซิร์ฟเวอร์ |
| master server | serveur maître | servidor maestro | servidor master | Master-Server | serwer główny | мастер-сервер | ana sunucu | マスターサーバー | มาสเตอร์เซิร์ฟเวอร์ |
| gamemode | mode de jeu | modo de juego | modo de jogo | Spielmodus | tryb gry | игровой режим | oyun modu | ゲームモード | โหมดเกม |
| resource | ressource | recurso | resource | Ressource | zasób | ресурс | kaynak | リソース | รีซอร์ส |
| license key | clé de licence | clave de licencia | chave de licença | Lizenzschlüssel | klucz licencyjny | лицензионный ключ | lisans anahtarı | ライセンスキー | คีย์ไลเซนส์ |
| sign in | se connecter | iniciar sesión | entrar | anmelden | zaloguj się | войти | giriş yap | ログイン | เข้าสู่ระบบ |
| account | compte | cuenta | conta | Konto | konto | аккаунт | hesap | アカウント | บัญชี |
| display name | pseudo | nombre visible | nome de exibição | Anzeigename | nazwa wyświetlana | отображаемое имя | görünen ad | 表示名 | ชื่อที่แสดง |
| host (a server) | héberger | alojar | hospedar | hosten | hostować | запустить сервер | barındırmak | サーバーを立てる / ホストする | โฮสต์ |
| release channel | canal de mise à jour | canal de actualizaciones | canal de atualização | Update-Kanal | kanał aktualizacji | канал обновлений | güncelleme kanalı | リリースチャンネル | ช่องทางอัปเดต |
| roleplay | roleplay | rol | roleplay | Rollenspiel | roleplay | ролевая игра | rol yapma | ロールプレイ | โรลเพลย์ |
| free roam | exploration libre | mundo libre | mundo livre | Freies Erkunden | swobodna eksploracja | свободная игра | serbest dolaşım | フリーローム | ฟรีโรม |

The channel names **Stable** and **Unstable** stay in English everywhere for now: they are the
labels the launcher shows in its settings. Align them with the launcher's own dictionaries once
those land.

### Open questions for the native reviewers

- fr: _pseudo_ for "display name"; _launcher_ kept rather than _lanceur_.
- de: _Rollenspiel_ where German RP communities often say _Roleplay_; _Freies Erkunden_ for the
  bundled Freeroam mode.
- ru: unit spellings (`мс`, `КиБ`) and the informal _админ-панель_ in a link label shortened to
  fit its card.
- ja: サイバーパンク2077 / ナイトシティ / 仮初めの自由 everywhere but the footer's trademark sentence;
  _Dev Tracker_ kept in Latin script while Devblog became 開発ブログ (開発トラッカー is the
  alternative); サーバー運営者 for "server creators"; サーバーを立てる on labels but ホストする in
  sentences; the NCWE release tag 安定版{version} (NCWE's own stable release, not the launcher
  channel); the copyright line 無断転載を禁じます; the SmartScreen quote and buttons (詳細情報 /
  実行) and the browsers' translate-menu names in `docsTranslate.howTo` (Safari and Chrome on
  Android least certain); the NCWE menu path left in English (Help > Open the logs folder).
- th: ลันเชอร์ (some players write ลอนเชอร์ or keep Launcher), รีซอร์ส (or สคริปต์), คีย์ไลเซนส์,
  เซิร์ฟเวอร์เฉพาะ for "dedicated server" (Thai hosts often keep the English), แฟกชัน (RP servers
  say แก๊ง / หน่วยงาน), ไวต์ลิสต์ (gamers write ไวท์ลิสต์), the watermark แจ็กอิน for "Jack in", the
  SmartScreen steps that keep Windows' English button names, a generic แปล in the browser
  how-to, and ที่ว่าง ("room") for the server filter group the English calls "Availability".
- th, line breaks: browsers wrap Thai with a word dictionary that does not know many
  transliterated loanwords, so a narrow column can split one (คอมมูนิ|ตี้ in the home intro at
  phone width; ICU also splits ลันเชอร์, โรลเพลย์, มัลติเพลเยอร์, ไคลเอนต์). A reviewer may prefer
  wordings that wrap better; an invisible word joiner would fix it but also breaks site search.
- The header bar has room for about the English length on each side of the logo; the browser
  check fails when a label runs into the logo or the icons. To fit, the bar says fr _Créer_,
  es _Crear_, pt-BR _Criar_, tr _Sunucu kur_ and pl _Docs_ (the mobile menu shows the same
  words); ja (サーバー作成, ドキュメント) and th (สร้างเซิร์ฟเวอร์, เอกสาร) fit in full.
- Other short labels tightened to fit and worth a second look: tr _Geliştiriciler için_, the
  German auth-page watermarks, de _24 Std._, de _Server-/Ersteller_, ru _Сначала рекомендуемые_,
  es _Preguntas frecuentes_, fr _Télécharger le launcher_, the Create page link labels in fr, es,
  de and ru, ru _Покажем в деле_ on the NCWE page, the server search placeholders in es,
  pt-BR, pl and ru, ja 全サーバー (the server rail), 空きあり, 注目を先頭に表示, 応答遅延 and
  プローブ未設定, and th อยู่ในไฟล์เดียว (host download title), ดูมัน / ทำงานจริง (NCWE reel) and
  ดาวน์โหลดเซิร์ฟเวอร์ for "Get the server".
