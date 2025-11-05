.PHONY: test

install:
	npm i

build: install
	npm run build

dev: install
	npm run watch

test: install
	npm run lint:eslint
	npm run lint:prettier
	npm run test

