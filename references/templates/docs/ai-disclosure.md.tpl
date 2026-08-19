# AI participation disclosure policy

This repository welcomes AI-assisted development and requires it to be disclosed. The goal is honest history: humans and machines cooperate, and the record says which is which.

## Disclosure requirements

- **Commits**: any commit whose content was materially produced or substantially revised by an AI assistant carries an `Assisted-by:` trailer in the body:

  ```
  Assisted-by: <assistant name or tool>
  ```

- **Pull requests**: a PR whose code, docs, or review was AI-generated in material part states so in the description (one sentence is enough: "Generated with assistance from <tool>; human-reviewed.").
- **Reviews**: AI-generated review comments are labeled as such when they drive a change.
- **Forbidden**: pretending AI-generated content is fully human work, or using an AI to impersonate a human reviewer or maintainer.

## Review requirements

- AI-generated content is not exempt from review: every contribution, human or AI, passes the repository's normal review process (see the `repo-review` skill).
- AI-generated prose receives the same semantic review as human prose; "an AI wrote it" is not a quality pass.

## Reasoning

Transparency builds trust: maintainers and users can audit who wrote what, and the decision log stays an honest account of why the code is the way it is.
