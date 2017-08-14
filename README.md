# poodle

Experimental email client with social features.
Poodle is in very early stages of development, so functionality is limited!
Currently you can read recent conversations from your inbox, reply to
conversations, and +1 messages.
See the [releases][] page for more detailed notes on features and known issues.


## Install from pre-built packages

You can download Poodle from the [releases][] page.
Releases are available for macOS, Linux, and Windows.

[releases]: https://github.com/PoodleApp/poodle/releases

### macOS

Download the file ending with `.dmg` and install as usual.

### Linux

Download the file ending with `.AppImage`, set it to be executable, and run it.
For example:

    $ cd ~/Downloads
    $ chmod a+x poodle-electron-0.2.2-x86_64.AppImage
    $ ./poodle-electron-0.2.2-x86_64.AppImage

### Windows

Download the file ending with `.exe` and run it.


## Building and running from source

### Prerequisites

Running from source is supported on macOS and Linux.
You might have success with the Linux Subsystem on Windows.

You must have these programs installed:

- Make, g++
- Node v8 or later
- yarn v0.26.0 or later

On macOS you can get Make and g++ by installing the
[Apple Command Line Tools Package][].
On Debian-based Linux systems you can get these by installing the
`build-essential` package.

[Apple Command Line Tools Package]: https://developer.apple.com/library/content/technotes/tn2339/_index.html

The easiest way to get the current version of Node is to run the
[nvm install script][nvm].
Follow the instructions printed by the installer,
and then run these commands to set the current stable Node release as your
default node:

    $ nvm install stable
    $ nvm alias default stable

[nvm]: https://github.com/creationix/nvm#install-script

If your package manager does not have a recent version of yarn available you
can get the latest version by following instructions on the
[yarn installation][yarn] page.

[yarn]: https://yarnpkg.com/lang/en/docs/install/

On Linux you also need some development libraries installed for building npm
modules with native dependencies.
On Debian-based systems the required dependencies are:

- `libgnome-keyring-dev`
- `libsecret-1-dev`


### Running

In the top level directory run the command:

    $ make start

### Developing

If you are going to be making code changes, it is helpful to automatically
rebuild on code changes.
First run `make` from the top-level directory of this repository to install
development dependencies, such as Babel:

    $ make

Then change to the poodle-electron directory:

    $ cd packages/poodle-electron

In a second terminal (still in the poodle-electron directory) run the script to
automatically rebuild on code changes:

    $ yarn run build:watch

That script watches for changes to poodle-electron source files. If you make
changes to source files for arfe, poodle-core, or poodle-service you may have
to run `make` manually from the poodle-electron directory. Or you can just make
another change to a poodle-electron source file, which will trigger the
automatic rebuild.

Finally run the app:

    $ yarn start

In most cases you can press Ctrl+R in the app to pick up code changes.
