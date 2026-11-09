# Site translation glossary

English (`en.json`) is the source. Every other dictionary mirrors its keys exactly;
`npm run verify:i18n` (scripts/check-i18n.mjs) enforces keys, `{placeholders}`, `<tags>`,
plural forms, list lengths and brand names. None of these translations has been reviewed by a
native speaker yet.

## Never translated

Written exactly as in English, in every language and every grammatical case:

- **OPEN//77**, **Open77**, **Open2077** (the platform), **NCWE** and **NCWE Studio**,
  **Workshop**, **Warden**, **Discord**, **GitHub**, **WolvenKit**, **ArchiveXL**, **RED4ext**.
- **Cyberpunk 2077**, **Night City** (kept in Latin script, Russian included, as on the
  rest of the platform), **CD PROJEKT RED**, **REDengine**.
- **Phantom Liberty** follows CD PROJEKT RED's own release titles, as in the launcher:
  Polish _Widmo wolności_, Russian _Призрачная свобода_, every other language
  _Phantom Liberty_.
- **Open Alpha**: the name of the programme, matching the English-only guide it links to.
- Code, file names, commands, environment variables, URLs, version numbers, and terminal-style
  labels such as `// NETWORK.SIGNAL` (the words after them are translated).
- Units are written the way the language writes them, as in the launcher: French `Ko Mo Go`
  (`Kio` for KiB), Russian `мс КБ МБ ГБ` (`КиБ`), `ms`/`MB` elsewhere; short time units follow
  the language (`il y a 5 s`, `5 с назад`). Sizes and durations the code measures are formatted
  by the code.
- Whatever a server operator wrote (server names, descriptions, tags) and anything the master
  server returns that has no translated code.

## How messages work

- `{name}` is filled by the code. Keep every placeholder, move it wherever the sentence needs it.
- `<tag>…</tag>` wraps a run the code renders (a link, bold, a key). Keep every tag pair and its
  name; the words inside are yours. Tags never nest.
- Plurals are objects: English has `one` and `other`; Polish and Russian also need `few` and
  `many`. `{count}` is formatted for the language by the code.
- A display title is an array of lines (`["Run your own", "Night City"]`) with `accent` listing
  the highlighted line(s) by index. Split the translation into as many lines as reads best and
  update `accent` so it still points at the emphasised words.
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

## Platform terms

Per-language choices made by the translators; game terms follow CD PROJEKT RED's official
localization of Cyberpunk 2077 where the game has the word. Where the launcher's glossary
(`Open77.Launcher/web/i18n/GLOSSARY.md` in the launcher repository) already has a term, the
site uses the same word, so a player reads one vocabulary in both.

| English | fr | es | pt-BR | de | pl | ru | tr |
|---|---|---|---|---|---|---|---|
| launcher | launcher | launcher | launcher | Launcher | launcher | лаунчер | başlatıcı |
| server browser | liste des serveurs | explorador de servidores | lista de servidores | Serverliste | lista serwerów | список серверов | sunucu listesi |
| directory | annuaire | directorio | diretório | Serververzeichnis | katalog | каталог | sunucu dizini |
| master server | serveur maître | servidor maestro | servidor master | Master-Server | serwer główny | мастер-сервер | ana sunucu |
| gamemode | mode de jeu | modo de juego | modo de jogo | Spielmodus | tryb gry | игровой режим | oyun modu |
| resource | ressource | recurso | resource | Ressource | zasób | ресурс | kaynak |
| license key | clé de licence | clave de licencia | chave de licença | Lizenzschlüssel | klucz licencyjny | лицензионный ключ | lisans anahtarı |
| sign in | se connecter | iniciar sesión | entrar | anmelden | zaloguj się | войти | giriş yap |
| account | compte | cuenta | conta | Konto | konto | аккаунт | hesap |
| display name | pseudo | nombre visible | nome de exibição | Anzeigename | nazwa wyświetlana | отображаемое имя | görünen ad |
| host (a server) | héberger | alojar | hospedar | hosten | hostować | запустить сервер | barındırmak |
| release channel | canal de mise à jour | canal de actualizaciones | canal de atualização | Update-Kanal | kanał aktualizacji | канал обновлений | güncelleme kanalı |
| roleplay | roleplay | rol | roleplay | Rollenspiel | roleplay | ролевая игра | rol yapma |
| free roam | exploration libre | mundo libre | mundo livre | Freies Erkunden | swobodna eksploracja | свободная игра | serbest dolaşım |

The channel names **Stable** and **Unstable** stay in English everywhere for now: they are the
labels the launcher shows in its settings. Align them with the launcher's own dictionaries once
those land.

### Open questions for the native reviewers

- fr: _pseudo_ for "display name"; _launcher_ kept rather than _lanceur_.
- de: _Rollenspiel_ where German RP communities often say _Roleplay_; _Freies Erkunden_ for the
  bundled Freeroam mode.
- ru: unit spellings (`мс`, `КиБ`) and the informal _админ-панель_ in a link label shortened to
  fit its card.
- The header bar has room for about the English length on each side of the logo; the browser
  check fails when a label runs into the logo or the icons. To fit, the bar says fr _Créer_,
  es _Crear_, pt-BR _Criar_, tr _Sunucu kur_ and pl _Docs_ (the mobile menu shows the same
  words).
- Other short labels tightened to fit and worth a second look: tr _Geliştiriciler için_, the
  German auth-page watermarks, de _24 Std._, de _Server-/Ersteller_, ru _Сначала рекомендуемые_,
  es _Preguntas frecuentes_, fr _Télécharger le launcher_, the Create page link labels in fr, es,
  de and ru, ru _Покажем в деле_ on the NCWE page, and the server search placeholders in es,
  pt-BR, pl and ru.
