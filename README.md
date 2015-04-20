# Goodwill

Goodwill is a little tool that measures how much you give and take when it
comes to code review. It answers the question: "do I review as much code for
other people as they review for me?"

Try it out, or learn more, at
[azirbel.github.io/goodwill](http://azirbel.github.io/goodwill/)!

## History

This project started after I got very behind on reviewing pull requests.
Following the principle "if you cannot measure it, you cannot improve it", I
wanted to make sure to track my code reviews so I wouldn't get behind again.

Here's the analysis of my code reviews at Addepar. I've improved!

![Number of code reviews](/../screenshots/azirbel-graph.png?raw=true)

## Setup for Development

Goodwill is an Ember app. You'll need git, node, bower, and ember-cli.

* `git clone git@github.com:azirbel/goodwill.git`
* `cd goodwill`
* `npm install`
* `bower install`

## Running / Development

* `ember server`
* Visit at [http://localhost:4200](http://localhost:4200).

## Releasing a New Version

* `grunt release-it:X.Y.Z`

## License

MIT. See the [license file](LICENSE).
