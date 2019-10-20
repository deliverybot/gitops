# GitOps action

Writes a set of manifests to a GitOps style repository and commits the result.

**This is currently in beta and the API around this action may change.**

## Parameters

### Inputs

- `remote`: Remote gitops repository to clone and commit to. (required)
- `branch`: Remote gitops repository branch. (required)
- `manifests`: Manifests are a list of files (in json format) to copy to
  target. (required)
- `target`: Folder name in the gitops repository to copy manifests to.
  (required)
- `token`: Github repository token.

## Example

TODO
