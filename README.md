<div align="center" style="display:flex;flex-direction:column;">
  <a href="https://excalidraw.com">
    <img width="540" src="./public/og-image-sm.png" alt="Excalidraw logo: Sketch handrawn like diagrams." />
  </a>
  <h3>Virtual whiteboard for sketching hand-drawn like diagrams.<br>Collaborative and end-to-end encrypted.</h3>
  <p>
    <a href="https://twitter.com/Excalidraw">
      <img alt="Follow Excalidraw on Twitter" src="https://img.shields.io/twitter/follow/excalidraw.svg?label=follow+excalidraw&style=social&logo=twitter">
    </a>
    <a target="_blank" href="https://crowdin.com/project/excalidraw">
      <img src="https://badges.crowdin.net/excalidraw/localized.svg">
    </a>
  </p>
  <p>Ask questions or hang out on our <a target="_blank" href="https://discord.gg/UexuTaE">discord.gg/UexuTaE</a>.</p>
</div>

## Try it now

Go to [excalidraw.com](https://excalidraw.com) to start sketching.

Read the latest news and updates on our [blog](https://blog.excalidraw.com). A good start is to see all the updates of [One Year of Excalidraw](https://blog.excalidraw.com/one-year-of-excalidraw/).

## Supporting Excalidraw

If you like the project, you can become a sponsor at [Open Collective](https://opencollective.com/excalidraw).

[<img src="https://opencollective.com/excalidraw/tiers/sponsors/0/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/0/website) [<img src="https://opencollective.com/excalidraw/tiers/sponsors/1/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/1/website) [<img src="https://opencollective.com/excalidraw/tiers/sponsors/2/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/2/website) [<img src="https://opencollective.com/excalidraw/tiers/sponsors/3/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/3/website) [<img src="https://opencollective.com/excalidraw/tiers/sponsors/4/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/4/website) [<img src="https://opencollective.com/excalidraw/tiers/sponsors/5/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/5/website) [<img src="https://opencollective.com/excalidraw/tiers/sponsors/6/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/6/website) [<img src="https://opencollective.com/excalidraw/tiers/sponsors/7/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/7/website) [<img src="https://opencollective.com/excalidraw/tiers/sponsors/8/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/8/website) [<img src="https://opencollective.com/excalidraw/tiers/sponsors/9/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/9/website) [<img src="https://opencollective.com/excalidraw/tiers/sponsors/10/avatar.svg?avatarHeight=120">](https://opencollective.com/excalidraw/tiers/sponsors/10/website)

<a href="https://opencollective.com/excalidraw#category-CONTRIBUTE" target="_blank"><img src="https://opencollective.com/excalidraw/tiers/backers.svg?avatarHeight=32"/></a>

Last but not least, we're thankful to these companies for offering their services for free:

[![Vercel](./.github/assets/vercel.svg)](https://vercel.com) [![Sentry](./.github/assets/sentry.svg)](https://sentry.io) [![Crowdin](./.github/assets/crowdin.svg)](https://crowdin.com)

## Documentation

### Shortcuts

You can almost do anything with shortcuts. Click on the help icon on the bottom right corner to see them all.

### Curved lines and arrows

Choose line or arrow and click click click instead of drag.

### Charts

You can easily create charts by copy pasting data from Excel or just plain comma separated text.

### Translating

To translate Excalidraw into other languages, please visit [our Crowdin page](https://crowdin.com/project/excalidraw). To add a new language, [open an issue](https://github.com/excalidraw/excalidraw/issues/new) so we can get things set up on our end first.

Translations will be available on the app if they exceed a certain threshold of completion (currently 85%).

### Create a collaboration session manually

In order to create a session manually, you just need to generate a link of this form:

```
https://excalidraw.com/#room=[0-9a-f]{20},[a-zA-Z0-9_-]{22}
```

#### Example

```
https://excalidraw.com/#room=91bd46ae3aa84dff9d20,pfLqgEoY1c2ioq8LmGwsFA
```

The first set of digits is the room. This is visible from the server that’s going to dispatch messages to everyone that knows this number.

The second set of digits is the encryption key. The Excalidraw server doesn’t know about it. This is what all the participants use to encrypt/decrypt the messages.

## Shape libraries

Find a growing list of libraries containing assets for your drawings at [libraries.excalidraw.com](https://libraries.excalidraw.com).

## Embedding Excalidraw in your App?

Try out [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw). This package allows you to easily embed Excalidraw as a React component into your apps.

## Development

### Code Sandbox

- Go to https://codesandbox.io/s/github/excalidraw/excalidraw
  - You may need to sign in with GitHub and reload the page
- You can start coding instantly, and even send PRs from there!

### Local Installation

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

#### Requirements

- [Node.js](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/getting-started/install) (v1 or v2.4.2+)
- [Git](https://git-scm.com/downloads)

#### Clone the repo

```bash
git clone https://github.com/excalidraw/excalidraw.git
```

#### Install the dependencies

```bash
yarn
```

#### Start the server

```bash
yarn start
```

Now you can open [http://localhost:3000](http://localhost:3000) and start coding in your favorite code editor.

#### Commands

| Command            | Description                       |
| ------------------ | --------------------------------- |
| `yarn`             | Install the dependencies          |
| `yarn start`       | Run the project                   |
| `yarn fix`         | Reformat all files with Prettier  |
| `yarn test`        | Run tests                         |
| `yarn test:update` | Update test snapshots             |
| `yarn test:code`   | Test for formatting with Prettier |

#### Docker Compose

You can use docker-compose to work on Excalidraw locally if you don't want to setup a Node.js env.

```sh
docker-compose up --build -d
```

### Self-hosting

We publish a Docker image with the Excalidraw client at [excalidraw/excalidraw](https://hub.docker.com/r/excalidraw/excalidraw). You can use it to self-host your own client under your own domain, on Kubernetes, AWS ECS, etc.

```sh
docker build -t excalidraw/excalidraw .
docker run --rm -dit --name excalidraw -p 5000:80 excalidraw/excalidraw:latest
```

The Docker image is free of analytics and other tracking libraries.

## Helm chart

This project comes with its own helm chart. The chart is currently hosted
through this repository under the `helm` directory.

To install using the helm chart, simply do the following:

```shell script
cd helm/
helm install excalidraw .
```

Chart configuration is as follows:

| Property | Default value | Description |
|----------|---------------|-------------|
| `replicaCount` | `1` | How many replicas to start |
| `image.repository` | `excalidraw/excalidraw` | This docker image repository |
| `image.tag` | latest | Docker image tag, by default uses `latest` |
| `image.pullPolicy` | `IfNotPresent` | [Pull policy](https://kubernetes.io/docs/concepts/containers/images/#updating-images) for the image |
| `imagePullSecrets` | `[]` | Pull secrets, if neccessary |

TODO: finish filling out this table

You can pass in overrides to the helm deployment in a few different ways:

```helm install excalidraw --set 'image.tag=latest' --set 'service.type=NodePort'```

Or you can maintain your own helm chart values.yaml file:

```# Default values for chart.
# This is a YAML-formatted file.
# Declare variables to be passed into your templates.
replicaCount: 3

service:
  type: NodePort
ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: nginx
    kubernetes.io/tls-acme: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
  labels: {}
  path: /
  hosts:
    - excalidraw.example.com
  tls:
  - hosts:
    - excalidraw.example.com
    secretName: excalidraw-certificate
```    

And then use this command to deploy using your values.yaml file

```helm install excalidraw --values ~/Desktop/values.yaml .```


**At the moment, self-hosting your own instance doesn't support sharing or collaboration features.**

We are working towards providing a full-fledged solution for self-hosting your own Excalidraw.

## Contributing

Pull requests are welcome. For major changes, please [open an issue](https://github.com/excalidraw/excalidraw/issues/new) first to discuss what you would like to change.

## Notable used tools

- [Create React App](https://github.com/facebook/create-react-app)
- [Rough.js](https://roughjs.com)
- [TypeScript](https://www.typescriptlang.org)
- [Vercel](https://vercel.com)

And the main source of inspiration for starting the project is the awesome [Zwibbler](https://zwibbler.com/demo/) app.
