# Server Monitor

A minimal self-hosted dashboard for monitoring server RAM usage in real time. Built with Next.js and Tailwind, runs in Docker.

## Setup

```bash
git clone git@github.com:dillon-webster/sever-dashboard.git
cd sever-dashboard
docker compose up -d --build
```

Then open `http://your-server-ip:3030` in a browser.

## Change the port

Set `PORT=XXXX` in `docker-compose.yml` if 3030 is taken.
