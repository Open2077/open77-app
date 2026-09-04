# Sky hologram advertisements

Open77 can replace Cyberpunk's giant vertical **Towers of Light** advertisements with art owned by
a server resource. The shipped example uses the exact Open77 logo and accepts either PNG or DDS as
author input.

This is a pre-boot asset pipeline. Lua declares the resulting package, but it cannot swap these
textures while the game is running: the particle material resolves its XBM through REDengine's
resource depot when the game boots.

## Build the Open77 example

Requirements:

- Cyberpunk 2077 2.31 available at the game directory;
- PowerShell 7;
- WolvenKit CLI 8.19 or a compatible release.

From the repository root:

```powershell
pwsh scripts/new-open77-sky-ad-texture.ps1

pwsh scripts/build-sky-advertising.ps1 `
  -InputPath assets/sky-ads/open77-towers-of-light.png `
  -ArchiveName Open77SkyAds `
  -OutputDirectory resources/open77_sky_ads/dist `
  -WolvenKitCli E:/Apps/WolvenKit.Console/WolvenKit.CLI.exe
```

The first command deterministically composites the tracked `assets/open77.png` logo into a
128×2048 strip. The second command:

1. extracts the four matching vanilla XBM headers from the local game installation;
2. imports the PNG into each header while preserving the measured texture contract;
3. validates dimensions, compression, group, gamma, streaming, downgrade and 12 mips;
4. packs `Open77SkyAds.archive`;
5. wraps it as `Open77SkyAds.zip` under `archive/pc/mod/`;
6. writes a manifest with hashes and sizes.

The archive index timestamp and its CRC64 are normalized, so rebuilding unchanged input produces
the same archive and package hash instead of forcing every player to download identical art again.

The scripts never install the archive and never start or stop the game. Extracted CDPR resources
stay under ignored `build/` paths and are not committed.

## Put it in a resource

Use this layout:

```text
resources/open77_sky_ads/
  open77.lua
  server/main.lua
  source/custom-strip.png
  dist/Open77SkyAds.zip
```

`open77.lua`:

```lua
resource "open77_sky_ads"
version "1.0.0"
auto_start true

server_script "server/main.lua"
preload_mod "dist/Open77SkyAds.zip"
```

`server/main.lua` can be minimal; the declaration does the boot work:

```lua
AddEventHandler("onResourceStart", function(name)
    if name == GetCurrentResourceName() then
        print("Open77 sky-ad theme declared for the next launcher boot")
    end
end)
```

Select `open77_sky_ads` in `resources.load` and leave `requiredMods.enabled` set to `true`. Restart
the dedicated server. Its effective required-mod digest now includes the resource package; players
receive it through the normal launcher Connect flow before Cyberpunk starts.

Do not also add the ZIP to `files`. Open77 excludes it if a broad glob happens to match, but the
source PNG does not need client delivery either. It is build input, not a WebUI texture.

## Custom PNG or DDS

The input must be exactly **128×2048**. PNG is the simplest authoring format. DDS is accepted for
artists who already control its export, but the rebuilt XBM is still validated against the vanilla
contract.

All four bands are replaced by default:

```powershell
pwsh scripts/build-sky-advertising.ps1 `
  -InputPath resources/open77_sky_ads/source/custom-strip.dds `
  -OutputDirectory resources/open77_sky_ads/dist `
  -ArchiveName MyWorldSkyAds
```

For a diagnostic partial replacer, pass `-Targets a,b` (valid values are `a`, `b`, `b_censored`,
and `c`). A public world should normally replace all four so quest/censorship variants do not fall
back to unrelated vanilla art.

## What is replaced

The archive overrides four vanilla depot paths below:

```text
base/environment/decoration/advertising/holograms/giant_commercial_stripe/
```

They are `giant_commercial_stripe_a.xbm`, `_b.xbm`, `_b_censored.xbm`, and `_c.xbm`.
Ten cityscape/quest particle resources consume these textures. The particles keep their own
vertical scroll, glow, alpha mask and fade, so source art remains static.

Ordinary billboards are a different Ink/TweakDB `worldAdvertisementNode` system. Tools such as
World Advert Configurator apply to those panels, not to the four sky stripes.

## Update and removal

After changing the source image:

1. rebuild the ZIP into the resource;
2. restart the dedicated server so it computes and publishes the new hash;
3. leave the current game session;
4. reconnect through the launcher so the new world profile is projected before boot.

A resource `restart` is insufficient. Removing the resource from `resources.load`, restarting the
server and launching that world again removes its package from the profile and restores vanilla,
unless another installed replacer targets the same paths.

The implementation evidence, exact hashes, texture header, particle consumers, Nexus comparison,
and hot-mount limitations are recorded in
[Advertising and sky holograms](../docs/research/advertising-and-sky-holograms.md).
