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

Note, in the example the `FLUX_KEY` is a deploy key that's allowed access to the
GitHub repository.

```yaml
# .github/workflows/gitops.yml
name: Deploy

on: ['deployment']

jobs:
  deployment:

    runs-on: 'ubuntu-latest'

    steps:
    - uses: actions/checkout@v1

    - uses: webfactory/ssh-agent@v0.1.1
      with:
        ssh-private-key: ${{ secrets.FLUX_KEY }}

    - name: 'gitops'
      uses: 'deliverybot/gitops@master'
      with:
        remote: 'git@github.com:colinjfw/kubernetes-guide.git'
        branch: 'master'
        # Copy the "pod.yml" manifest over to...
        manifests: '["pod.yml"]'
        # ... the deploy folder in the remote specified.
        target: 'deploy'
        token: '${{ github.token }}'
```
