UUID    := pop-shell@system76.com
NAME    := pop-shell
DIST    := dist
BIN     := $(CURDIR)/node_modules/.bin

ifeq ($(XDG_DATA_HOME),)
XDG_DATA_HOME := $(HOME)/.local/share
endif

ifeq ($(strip $(DESTDIR)),)
INSTALL := $(XDG_DATA_HOME)/gnome-shell/extensions/$(UUID)
else
INSTALL := $(DESTDIR)/usr/share/gnome-shell/extensions/$(UUID)
endif

TS_SOURCES := $(wildcard src/*.ts src/launcher/*.ts src/color_dialog/src/*.ts src/floating_exceptions/src/*.ts)

.PHONY: all build compile lint format format-check test test-fuzz type-check dist pack zip zip-file install uninstall enable disable configure clean help

# Default target
all: build

$(DIST)/.built: $(TS_SOURCES)
	@if [ ! -d node_modules ]; then pnpm install; fi
	$(BIN)/tsc
	$(BIN)/tsc -p src/color_dialog
	$(BIN)/tsc -p src/floating_exceptions
	$(BIN)/prettier --write '$(DIST)/**/*.js'
	node scripts/format-dist.mjs
	@touch $@

schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.$(NAME).gschema.xml
	glib-compile-schemas schemas

dist: $(DIST)/.built schemas/gschemas.compiled
	@mkdir -p $(DIST)
	@cp -r schemas $(DIST)/
	@cp metadata.json $(DIST)/
	@node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('$(DIST)/metadata.json'));m['version-name']=JSON.parse(fs.readFileSync('package.json')).version;fs.writeFileSync('$(DIST)/metadata.json',JSON.stringify(m,null,4)+'\n');"
	@cp stylesheet.css $(DIST)/
	@cp -r icons $(DIST)/ 2>/dev/null || true
	@cp -r keybindings $(DIST)/ 2>/dev/null || true

$(UUID).zip: dist
	@rm -f $(UUID).zip
	@(cd $(DIST) && zip ../$(UUID).zip -9r . -x ".built" "schemas/gschemas.compiled" "scratch/*" "scripts/*" ".git/*" ".github/*")
	@echo "Created '$(UUID).zip'"

## build   : Compile TypeScript -> JavaScript
build: $(DIST)/.built

compile: dist

## lint    : Run ESLint
lint:
	$(BIN)/eslint src tests

## type-check : Run TypeScript type checks without emitting
type-check:
	$(BIN)/tsc --noEmit
	$(BIN)/tsc -p src/color_dialog --noEmit
	$(BIN)/tsc -p src/floating_exceptions --noEmit

## format  : Format TypeScript sources with Prettier
format:
	$(BIN)/prettier --write 'src/**/*.ts' 'tests/**/*.ts'

## format-check : Check formatting with Prettier
format-check:
	$(BIN)/prettier --check 'src/**/*.ts' 'tests/**/*.ts'

## test    : Run unit and integration tests
test:
	$(BIN)/vitest run

## test-fuzz : Run property-based fuzz tests
test-fuzz:
	$(BIN)/vitest run tests/fuzz.test.ts

## pack    : Create a zip package for distribution
pack: $(UUID).zip

zip: pack

zip-file: pack

## install : Install the extension locally (or to DESTDIR when packaging)
install: $(if $(strip $(DESTDIR)),dist,$(UUID).zip)
ifeq ($(strip $(DESTDIR)),)
	gnome-extensions install --force $(UUID).zip
else
	rm -rf "$(INSTALL)"
	mkdir -p "$(INSTALL)"
	cp -r $(DIST)/* "$(INSTALL)/"
	rm -f "$(INSTALL)/.built"
endif

## configure : Apply recommended Pop Shell GNOME shortcuts
configure:
	sh scripts/configure.sh

## enable  : Enable the extension
enable:
	gnome-extensions enable "$(UUID)"

## disable : Disable the extension
disable:
	gnome-extensions disable "$(UUID)"

## uninstall : Remove the extension
uninstall:
	rm -rf "$(INSTALL)"

## clean   : Remove build artifacts
clean:
	rm -rf $(DIST)/ tsconfig.tsbuildinfo src/color_dialog/tsconfig.tsbuildinfo src/floating_exceptions/tsconfig.tsbuildinfo $(UUID).zip schemas/gschemas.compiled

## help    : Show this help message
help:
	@grep -E '^##' Makefile | sed 's/^## //'
