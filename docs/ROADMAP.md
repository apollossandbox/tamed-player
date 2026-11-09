# Tamed Player roadmap

Goal: one free place to make, share and release music. Money comes from a marketplace (beats, kits, project files) and paid commissions, with a small fee. Artists keep ownership of everything they sell.

Order of work, because each step needs the one before it:

1. Accounts and cloud sync
2. Shared folders and projects with roles
3. Marketplace (listings, checkout, payouts)
4. Commissions
5. Vinyl, cassette and other physical formats (no server needed, so this can run alongside 1–4)

---

## 1. Accounts and cloud sync

Today everything lives on one device (browser storage, or the Windows app's data folder). Sharing and selling need a server.

- **Backend:** Postgres with file storage and auth in one service (Supabase fits: auth, row-level security, storage buckets, realtime). Stripe for money.
- **What syncs:** projects, tracks and versions, covers, CD designs, fonts the user uploaded, Audio Doctor results.
- **Local first:** the app keeps working offline and syncs when online. Each record gets an `updatedAt`, and the server copy wins only when it is newer.
- **Storage limits:** a free tier with generous audio storage (lossless masters are big). Paid storage could come later, but stays optional.

## 2. Shared folders and projects

The new **Folder** project type is the start: no release date, no CD, just songs and credited collaborators.

- **Invite by link or username.** Roles decide what someone can do:

  | Role | Listen | Comment | Upload versions | Edit details / art | Invite | Delete |
  |---|---|---|---|---|---|---|
  | Owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
  | Artist, Producer, Engineer | ✓ | ✓ | ✓ | ✓ | – | – |
  | Manager, Executive producer | ✓ | ✓ | – | ✓ | ✓ | – |
  | Listener | ✓ | ✓ | – | – | – | – |

- **Credits follow the work.** Whoever uploads a version is credited on it, and the song's credits table fills in from roles.
- **Timestamped comments** on a song ("0:42 hi-hats too loud"), shown on the waveform.
- **Version history** keeps every upload, with who uploaded it and when.
- **Friends and groups:** follow other users, plus a group space (for example "KGB") that holds shared folders.

## 3. Marketplace

Like BeatStars, but inside the app where the music is made.

- **What can be sold:** beats (lease or exclusive), drum kits, sample packs, presets, and project files (FL Studio `.flp` with samples, stems).
- **Beat licence tiers,** set by the seller with sensible defaults:
  - MP3 lease
  - WAV lease
  - Trackouts (stems)
  - Unlimited
  - Exclusive
- **Licence terms:** a plain-language licence is generated for each sale (streams cap, credit line, publishing split) and saved with the order. Sellers keep ownership. An exclusive sale ends future leases, but leases already sold stay valid.
- **Previews:** listings stream a tagged, lower-quality preview, and the clean files unlock after purchase. Audio Doctor's tempo and key fill in the listing automatically.
- **Fee:** 5% platform fee, taken from the sale before payout. Card processing (about 3%) is a separate cost, and we need to decide whether the buyer or the seller covers it.
- **Payouts:** Stripe Connect Express. Sellers verify their identity once, and Stripe handles tax forms and payouts to their bank.
- **Safety:**
  - A copyright report and takedown process.
  - No uploading other people's masters.
  - Samples must be cleared or royalty-free, and the seller confirms this when listing.
  - Refund window for files that don't match the listing.

## 4. Commissions

Two directions, same system:

- **Artists open commissions:** "Custom beat, $40, 5 days, 2 revisions."
- **Buyers post requests:** "I need a Jay-Z *Blueprint*-type beat, my budget is $15." Creators apply or send a sample, and the buyer picks one.

How a job runs:

1. Agree on price, deadline and number of revisions.
2. The buyer pays upfront, and the money is held by Stripe.
3. The creator delivers inside the app (files plus an in-app preview).
4. The buyer accepts, or asks for a revision.
5. On acceptance, or automatically after a few days of no response, the payment is released minus the 5% fee.
6. Disputes go to a simple review queue.

The creator keeps ownership unless the job says the rights transfer. The licence is generated the same way as in the marketplace.

## 5. Vinyl, cassette and other physical formats

The CD creator already has the parts this needs: print sheets with bleed, a 3D model built in code, art placed in 3D or on a flat sheet, GLB export, and multiple designs per project. The plan is to turn "CD" into one **format** among several.

### Formats

| Format | Print parts | 3D model | Running time |
|---|---|---|---|
| CD jewel case (now) | Booklet, inside, tray card, spines, under-tray, disc | Done | 80 min |
| CD digipak / eco-wallet | Wallet panels, spine, disc | Card wallet with tray or slot | 80 min |
| 12" LP | Jacket front/back, spine, 2 labels, inner sleeve, optional gatefold and obi strip | Jacket, sleeve, record with grooves | About 18–22 min per side |
| 7" single | Picture sleeve, 2 labels | Sleeve plus record | About 4–5 min per side |
| Cassette | J-card (front, spine, back flap), shell labels A/B, optional O-card | Shell, Norelco case | C60 = 30 min per side |
| USB card / download card | Card front/back | Flat card | – |

### Building it

- **Format templates:** each format declares its sheets (size, bleed, safe area, fold lines), its 3D builder, and its running-time rule. The existing `SHEETS` table becomes one template.
- **Sides:** vinyl and cassette need an **A/B side** view. Drag songs between sides, see time used per side, and get a warning when a side runs long (long vinyl sides lose loudness and bass).
- **Record look:** coloured, splatter and picture-disc options on the 3D record; centre labels come from the label sheets.
- **Exports:** a print zip per format, plus the GLB, using the same "Name - disc.zip" layout (it becomes "Name - vinyl.zip" and so on).
- **Pressing plants:** sizes follow common plant templates, but every plant differs, so the app tells people to check their plant's template, as the CD creator does now. Later we could partner with plants for direct ordering, which is another possible revenue line.

### First steps

1. Turn the CD into a "format" without changing how it looks.
2. Build the 12" LP: jacket, labels and an A/B side view.
3. Build the cassette J-card and shell.
4. Add the 7", digipak and gatefold.

---

## Decisions to make

1. Who pays card processing fees, buyer or seller?
2. Which backend? Supabase is the suggestion: fastest path with auth, storage and realtime built in.
3. Free storage limit per account.
4. Whether exclusives remove the beat from the store automatically. Suggested: yes.
5. Which countries payouts launch in (Stripe Connect availability).
