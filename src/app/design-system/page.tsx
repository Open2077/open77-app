import NextLink from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Chip, Tag } from "@/components/ui/chip";
import { CodeBlock } from "@/components/ui/code-block";
import { Avatar, Breadcrumbs, DefinitionList, Table } from "@/components/ui/data";
import { EmptyState, Loader, Meter, Notice, Stat } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { download02, search01, star } from "@/components/ui/icons";
import { Page, PageHero, Section } from "@/components/ui/page";
import { Panel } from "@/components/ui/panel";
import { Prose } from "@/components/ui/prose";
import { Display, Eyebrow } from "@/components/ui/typography";

export const metadata = { title: "Design system", robots: { index: false, follow: false } };

/** Living reference of the UI primitives. Development only. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Page tone="yellow">
      <PageHero
        eyebrow="OPEN//77 · Design system"
        title={["Build it", "in the same", "language"]}
        accent={[1]}
        lead="Every primitive of the site, on one page: typography, actions, surfaces, forms, data and feedback."
        actions={
          <>
            <Button lines="left" icon={download02} iconPosition="left">
              Primary action
            </Button>
            <Button border lines="none">
              Secondary
            </Button>
            <Button color="neutral" lines="none" size="sm">
              Neutral
            </Button>
          </>
        }
        aside={
          <div style={{ display: "flex", gap: "2.5rem" }}>
            <Stat value="43" label="Servers online" />
            <Stat value="312" label="Players" detail="last 5 minutes" />
          </div>
        }
        art={{ src: "/home/img/players-bg.webp" }}
        watermark="System"
      />

      <Section eyebrow="Typography" title={["Display", "sizes"]} lead="Druk Text Wide for titles, Satoshi for copy, Nippo for labels, JetBrains Mono for code.">
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <Display size="lg" lines={["Large title", "with accent"]} accent={[1]} />
          <Display size="md">Medium title</Display>
          <Display size="sm">Small title for cards</Display>
          <Display size="xs">Extra small title</Display>
          <Eyebrow index={1}>Eyebrow with index</Eyebrow>
          <Eyebrow muted>Muted eyebrow</Eyebrow>
          <Breadcrumbs items={[{ label: "Docs", href: "/docs" }, { label: "Hosting", href: "/docs" }, { label: "Licensing" }]} />
        </div>
      </Section>

      <Section eyebrow="Actions" title="Buttons and chips">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "center" }}>
          <Button lines="left">Yellow</Button>
          <Button color="blue" lines="both">
            Blue
          </Button>
          <Button color="red">Red</Button>
          <Button border lines="none" color="blue">
            Outline
          </Button>
          <Button lines="none" icon={star} iconOnly aria-label="Favorite" border />
          <Button lines="none" size="sm" icon={search01} iconPosition="left" color="neutral">
            Small neutral
          </Button>
          <Button lines="none" disabled>
            Disabled
          </Button>
          <Button lines="none" busy>
            Busy
          </Button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "2rem" }}>
          <Chip pressed count={43}>
            All
          </Chip>
          <Chip count={21}>Roleplay</Chip>
          <Chip count={6}>Racing</Chip>
          <Chip size="sm">Small chip</Chip>
          <Tag>Roleplay</Tag>
          <Tag tone="blue">v0.4.2</Tag>
          <Tag tone="red" variant="solid">
            Beta
          </Tag>
          <Tag tone="neutral">Neutral</Tag>
        </div>
      </Section>

      <Section eyebrow="Surfaces" title="Panels">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "2rem" }}>
          <Panel brackets>
            <Eyebrow>Frame + brackets</Eyebrow>
            <p style={{ marginTop: ".75rem", color: "var(--text-dim)" }}>The default surface for tall content.</p>
          </Panel>
          <Panel variant="outline" tone="blue">
            <Eyebrow>Outline · blue</Eyebrow>
            <p style={{ marginTop: ".75rem", color: "var(--text-dim)" }}>Tone border, no fill.</p>
          </Panel>
          <Panel shape="slant" brackets interactive>
            <Eyebrow>Slant card</Eyebrow>
            <Display size="sm" as="h3">
              Live another life
            </Display>
          </Panel>
          <Panel variant="ghost" interactive>
            <Eyebrow muted>Ghost · interactive</Eyebrow>
            <p style={{ marginTop: ".75rem", color: "var(--text-dim)" }}>Hairline only.</p>
          </Panel>
        </div>
      </Section>

      <Section eyebrow="Forms" title="Fields">
        <Panel brackets padding="lg">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.75rem" }}>
            <Field label="Server name" hint="Shown in the server browser.">
              <Input placeholder="Night City Roleplay" />
            </Field>
            <Field label="Search" optional>
              <Input icon={search01} placeholder="Search servers" trailing={<kbd>/</kbd>} />
            </Field>
            <Field label="Region">
              <Select defaultValue="eu">
                <option value="eu">Europe</option>
                <option value="na">North America</option>
              </Select>
            </Field>
            <Field label="Email" error="This address is already registered.">
              <Input type="email" defaultValue="v@afterlife.nc" />
            </Field>
            <Field label="Description">
              <Textarea placeholder="Tell players what your world is about." />
            </Field>
            <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
              <Checkbox defaultChecked>Hide empty servers</Checkbox>
              <Checkbox>Has room to join</Checkbox>
              <Switch defaultChecked>Public listing</Switch>
            </div>
          </div>
        </Panel>
      </Section>

      <Section eyebrow="Data" title="Tables and facts">
        <Table caption="Servers">
          <thead>
            <tr>
              <th>Server</th>
              <th>Mode</th>
              <th data-numeric>Players</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>NCRP</td>
              <td>
                <Tag>Roleplay</Tag>
              </td>
              <td data-numeric>48 / 128</td>
            </tr>
            <tr>
              <td>Afterlife Racing</td>
              <td>
                <Tag tone="blue">Racing</Tag>
              </td>
              <td data-numeric>12 / 32</td>
            </tr>
          </tbody>
        </Table>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "2rem" }}>
          <DefinitionList
            items={[
              { label: "Locale", value: "en-US" },
              { label: "Game type", value: "Roleplay" },
              { label: "Version", value: "2.31.13" },
            ]}
          />
          <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
            <Meter value={38} label="48 of 128 players" />
            <Meter value={92} label="Nearly full" tone="var(--red)" />
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <Avatar name="Johnny Silverhand" />
              <Avatar name="v" size={32} />
              <Loader label="SERVER.RUNTIME" />
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Feedback" title="Notices and empty states">
        <div style={{ display: "grid", gap: "1rem" }}>
          <Notice title="Alpha access required">
            Use <code>/alpha apply</code> on our Discord to play, host and build.
          </Notice>
          <Notice kind="warning" title="Directory unreachable" action={<Button size="sm" lines="none" border>Retry</Button>}>
            The master server did not answer. Showing the last known list.
          </Notice>
          <Notice kind="danger" title="Sign-in failed">
            The email or the password is wrong.
          </Notice>
          <EmptyState eyebrow="No match" title="No matching servers" action={<Button size="sm" lines="none" border>Show all servers</Button>}>
            Remove a filter or try a different search.
          </EmptyState>
        </div>
      </Section>

      <Section eyebrow="Long form" title="Prose and code" width="narrow">
        <Prose>
          <p>
            Gameplay on an OPEN//77 server is <strong>scripted</strong>, not configured. A resource is a small Lua 5.4
            package your server loads and <NextLink href="/docs">streams to every player</NextLink>.
          </p>
          <h2>Write your first resource</h2>
          <p>Create a folder, add a manifest, and the server picks it up on the next reload.</p>
          <ul>
            <li>Client scripts run inside the game.</li>
            <li>Server scripts own the authoritative world.</li>
          </ul>
          <ol>
            <li>Create the folder.</li>
            <li>Write the manifest.</li>
          </ol>
          <h3>A subsection</h3>
          <blockquote>Save the file, it is live.</blockquote>
          <p>
            Call <code>Open77.vehicles.create</code> to spawn a vehicle.
          </p>
        </Prose>
        <div style={{ marginTop: "2rem" }}>
          <CodeBlock
            title="resources/ride/server/main.lua"
            language="lua"
            code={'RegisterCommand("ride", function(source, args)\n  local spot = Open77.players.position(source)\nend)'}
          />
        </div>
      </Section>
    </Page>
  );
}
