# Running the classroom server on Proxmox

One Linux VM runs everything through Docker Compose: MongoDB, the website (port 80) and the game server (port 7192).
Students open `http://<server address>` in a browser. They don't install anything.

## 1. Create the VM in Proxmox

In the Proxmox web UI, click **Create VM**:

| Setting | Value |
|---|---|
| OS | Debian 12 or Ubuntu 24.04 server ISO |
| CPU | 2 cores, **Type: `host`** (MongoDB needs the AVX instructions, which the default `kvm64`/`x86-64-v2-AES` types hide) |
| Memory | 4 GB |
| Disk | 20 GB |
| Network | Bridge `vmbr0` (the same network as the students) |

Install the OS. Give the VM a fixed IP, either with a DHCP reservation on your router or a static address, because students will type it.

> **LXC instead of a VM?** That works too if the container has **Nesting** and **keyctl** enabled (Options → Features). Docker inside a VM is the simpler, better-isolated choice.

## 2. Install Docker and get the code

SSH into the VM, then run:

```sh
curl -fsSL https://get.docker.com | sudo sh
sudo apt-get install -y git
git clone -b claude/keen-ptolemy-ts33oc https://github.com/oregonlooney/adventureland-blockly.git
cd adventureland-blockly
```

(Once the branch is merged, drop `-b claude/keen-ptolemy-ts33oc`.)

## 3. Configure and start it

```sh
./deploy/setup.sh                 # asks for the address students will use, e.g. 192.168.1.50
sudo docker compose up -d --build
```

The first build takes a few minutes. After that, the game server needs about 30 more seconds to load the maps. Check on it with:

```sh
sudo docker compose ps            # mongo "healthy", seed "exited (0)", web and game "running"
sudo docker compose logs -f game  # wait for "Calculations took ..."
```

Open `http://<address>`, click **Free Signup [Educational Use]**, create a character, and enter the game.
The **BLOCKLY** button is in the top-right bar, next to **CODE**.

The containers restart on their own after a reboot.

## 4. Make yourself the admin

Sign up first, then run:

```sh
sudo docker compose exec web node deploy/scripts/classroom.js make-admin you@example.com
```

Other teacher commands (run `classroom.js` with no arguments to see all of them):

```sh
sudo docker compose exec web node deploy/scripts/classroom.js list-users
sudo docker compose exec web node deploy/scripts/classroom.js reset-password student@school.lan   # prints a reset link
sudo docker compose exec web node deploy/scripts/classroom.js verify-all    # removes the "email not verified" debuff
```

Email is never sent, so students can sign up with any address that looks like an email, such as `alice@class.lan`.

## Things to know

- **Passwords:** the server runs in upstream's development mode, which is required for web signups. That mode logs signup and login passwords in plain text, and it stores passwords with weak hashing. Have students use a class-only password.
- **Reaching it from outside your network:** don't port-forward it. Use a Cloudflare Tunnel instead, see [CLOUDFLARE.md](CLOUDFLARE.md). Keep `.env` private: it holds the admin keys.
- **Characters per IP:** the game allows 3 characters online at once per IP address. This is fine when every student has their own computer. If many students share one IP address, run `classroom.js allow-ip <address>`.
- **MongoDB won't start** (it exits immediately, or logs mention AVX): set the VM CPU type to `host`. If that isn't possible, uncomment `MONGO_IMAGE=mongo:4.4` in `.env`.
- **Browsers can't connect to the game** (the page loads, but the game hangs on connecting): check that `PUBLIC_HOST` in `.env` is the address students actually use, and that port 7192 isn't blocked by a firewall. After editing `.env`, run `sudo docker compose up -d`.

## Announcements and a nightly shutdown

To send a message to everyone online (it shows in their chat and game log):

```sh
sudo docker compose exec web node deploy/scripts/classroom.js announce "The server shuts down at 10:00pm. It's a school night!"
```

To do this automatically, warn players and then stop the server on school nights (Sunday to Thursday), and start it again on school mornings. First set the VM's clock to your time zone, for example `sudo timedatectl set-timezone America/Los_Angeles`. Then open the root crontab with `sudo crontab -e` and add:

```
45 21 * * 0-4  cd /opt/adventureland-blockly && docker compose exec -T web node deploy/scripts/classroom.js announce "The server shuts down at 10:00pm (in 15 minutes). It's a school night!"
55 21 * * 0-4  cd /opt/adventureland-blockly && docker compose exec -T web node deploy/scripts/classroom.js announce "5 minutes until the server shuts down. Good night!"
0 22 * * 0-4   cd /opt/adventureland-blockly && docker compose stop
0 7 * * 1-5    cd /opt/adventureland-blockly && docker compose up -d
```

Each line starts with minute, hour, day of month, month and day of the week (0 = Sunday). Characters are saved when the server stops.

## Turning game events off

Adventure Land runs seasonal and timed events. The **anniversary** event is off by default: it asks players to find a "featured player" and send them a kiss for a reward. Its KISS and 10 YEARS buttons don't appear while it's off. The "I Kiss You" emote itself stays available.

To choose which events are off, set `DISABLED_EVENTS` in `.env` as a comma-separated list, for example `DISABLED_EVENTS=anniversary,halloween`. Leave it empty (`DISABLED_EVENTS=`) to allow every event. Then run `sudo docker compose up -d` to apply the change.

Event names: anniversary, halloween, valentines, holidayseason, lunarnewyear, goobrawl, crabxx, abtesting, icegolem, franky.

## Updating

```sh
git pull
sudo docker compose up -d --build
```

## Backups

```sh
sudo docker compose exec -T mongo mongodump --archive --db adventureland > backup-$(date +%F).archive
# restore:
sudo docker compose exec -T mongo mongorestore --archive --drop < backup-2026-01-01.archive
```

## Starting over

This deletes all accounts and characters:

```sh
sudo docker compose down -v
sudo docker compose up -d
```

## Pulling in a newer Adventure Land

This fork tracks https://github.com/kaansoral/adventureland_mongodb:

```sh
git remote add upstream https://github.com/kaansoral/adventureland_mongodb   # once
git fetch upstream && git merge upstream/main
```

The Blockly files are separate from upstream's files, so merges rarely conflict. Only three upstream files are edited, each by a few lines marked "Blockly Edition": `htmls/index.html`, `adventure_functions.js` (`server_url`) and `api.js` (the signup limit).
If upstream changes the shared engine (https://github.com/kaansoral/common_engine), update `COMMON_ENGINE_REF` in `deploy/Dockerfile` to its latest commit.
