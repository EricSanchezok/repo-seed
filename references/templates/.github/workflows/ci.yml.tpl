name: CI

# repo-seed ext-ci template.
# Runs the governance gates on every push and pull request.
#
# Security notes:
# - `permissions: {}` grants this workflow no default token permissions; add
#   explicit permissions only when a step genuinely needs them.
# - Pin third-party actions to a full commit SHA instead of a tag for
#   supply-chain safety (e.g. `actions/checkout@<full-sha>`).

on:
  push:
  pull_request:

permissions: {}

jobs:
  gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Decision log gate
        run: node scripts/verify-decisions.mjs
      - name: Doc links gate
        run: node scripts/verify-doc-links.mjs
      - name: Placeholder gate
        run: node scripts/verify-placeholders.mjs
      - name: Manifest gate
        run: node scripts/verify-manifest.mjs
      - name: Tests
        run: __CI_TEST_COMMAND__
