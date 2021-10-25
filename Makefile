.PHONY: test

build:
	yarn && yarn build

dev:
	yarn && yarn watch

test:
	yarn && yarn lint && yarn test
