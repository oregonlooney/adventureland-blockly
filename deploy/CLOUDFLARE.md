# Putting the classroom server on the internet with a Cloudflare Tunnel

A Cloudflare Tunnel lets students reach the game at an address like `https://adventure.yourdomain.com`:

- **No open ports:** the VM connects out to Cloudflare, so you don't open or forward any ports on your network.
- **HTTPS:** Cloudflare adds it for you.
- **One address to whitelist:** the website, the game connection and Blockly all use the same address. Nothing else needs whitelisting.

You need a domain whose DNS is managed by Cloudflare (the free plan is fine), and the server already running as described in [README.md](README.md).

## 1. Create the tunnel

1. In the Cloudflare dashboard open **Zero Trust**, then go to **Networks → Tunnels**. It may be called **Connectors** in newer versions of the dashboard.
2. **Create a tunnel** → type **Cloudflared** → name it `adventureland` → **Save**.
3. Cloudflare shows install commands. **Don't run them**; Docker runs cloudflared for you. Copy the long token after `--token`, which starts with `eyJ`.

## 2. Add the two routes

In the tunnel's **Public Hostname** tab ("Published application routes" in newer versions), add two routes for the same hostname. **Add them in this order:**

| # | Subdomain | Domain | Path | Service type | URL |
|---|---|---|---|---|---|
| 1 | `adventure` | yourdomain.com | `^/socket\.io/` | HTTP | `localhost:7192` |
| 2 | `adventure` | yourdomain.com | *(empty)* | HTTP | `localhost:80` |

The first route carries the live game connection. The second one serves the website. Cloudflare checks routes from the top, so the `socket.io` route must be listed first; drag it up if it isn't.

Type the path exactly as shown, including `^` and `\`. Cloudflare treats it as a pattern that can match anywhere in the address, and a plain `socket.io` would also catch the website's `/js/socket.io/.../socket.io.min.js` file. The game page then loads without it and never connects.

## 3. Turn it on in the VM

Add these lines to the end of the `.env` file in the `adventureland-blockly` folder, with your own hostname and token:

```sh
PUBLIC_URL=https://adventure.yourdomain.com
COMPOSE_PROFILES=tunnel
TUNNEL_TOKEN=eyJ...the token from step 1...
```

Then run:

```sh
cd /opt/adventureland-blockly
git pull
docker compose up -d --build
docker compose logs tunnel     # look for "Registered tunnel connection"
```

Open `https://adventure.yourdomain.com`. The tunnel's status in the Cloudflare dashboard should say **Healthy**.

With `PUBLIC_URL` set, the game connection always goes through Cloudflare, even when you open the site by its LAN IP. The game still works on your home network, as long as that network has internet access.

## 4. Only let your school in

Everyone at school reaches the internet through the school's **public** IP address. To find it, open this page on the school Wi-Fi (it's on your whitelisted address, so it will load):

```
https://adventure.yourdomain.com/cdn-cgi/trace
```

The `ip=` line is the school's public address. Do the same at home if you want access from there too.

Then in the Cloudflare dashboard (your domain, not Zero Trust): **Security → WAF → Custom rules → Create rule**. Name it `School only`, click **Edit expression** and paste this, using your hostname and IP addresses:

```
(http.host eq "adventure.yourdomain.com" and not ip.src in {203.0.113.10 198.51.100.7})
or (http.host eq "adventure.yourdomain.com" and http.request.uri.path eq "/rearm")
```

Set the action to **Block** and **Deploy**. The second line blocks a maintenance page that anyone could otherwise use to knock the game server offline.

If the school's IP address changes (the site starts showing a Cloudflare "blocked" page at school), check `/cdn-cgi/trace` again from a computer the rule still allows, then update the rule.

## 5. Many students, one IP

Behind Cloudflare, everyone at school arrives from the school's public addresses. Upstream Adventure Land limits each IP address to 3 signups a day and 3 characters online, but this server turns those per-IP limits off by default (`IP_LIMITS`, see [README.md](README.md)), so there's nothing to do. Your firewall rule from step 4 decides who can reach the game at all.

To see which addresses players connect from, run:

```sh
docker compose exec web node deploy/scripts/classroom.js list-ips
```

## Good to know

- **Cloudflare scripts:** turn off Cloudflare features that inject scripts into pages. **Web Analytics** (Analytics & Logs → Web Analytics) and Rocket Loader load files from other Cloudflare domains, which the school Wi-Fi blocks. Web Analytics can be on by default: a console error about `static.cloudflareinsights.com` means it is.
- **LAN access:** the LAN setup keeps working. Remove the three lines from `.env` and run `docker compose up -d` to go back to it.
- **Firewall:** the VM still listens on ports 80 and 7192 on your home network. Nothing needs to be forwarded on your router.
