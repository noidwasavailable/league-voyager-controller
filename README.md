# league-voyager-controller

Controls the Voyager keyboard from ZSA with signals from the League of Legends client.

Uses:
1. [Kontroll](https://github.com/zsa/kontroll) to control Voyager LEDs
2. LCU API to get information from the League of Legends client

## Feature Roadmap

- [x] change summoner spell LED colors depending on the selected summoner spells
- [ ] highlight item slots with active items
- [ ] implement skill/summoner spell/item cooldowns

## Installation and Usage

To install dependencies:

```bash
bun install
```

To run:

```bash
bun start
```

This project was created using `bun init` in bun v1.2.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
