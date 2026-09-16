# Promote a tested branch

Merge this workflow and its script into `main` once. GitHub only makes manual
workflows available when they exist on the default branch. Install GitHub CLI
and sign in once with `gh auth login`.

After pushing and testing a feature branch, run this from your repository folder
(works in PowerShell, Bash, and Command Prompt):

```sh
gh workflow run promote-branch.yml --ref main -f source=fix/mobile-cold-start-loading
```

This merges the remote source branch into `develop` and `main`. It does not push
uncommitted or unpushed local changes. Replace the source with the branch you tested.
The entire source branch history is merged, not just its latest commit.

For other existing branches, list them explicitly:

```sh
gh workflow run promote-branch.yml --ref main -f source=fix/mobile-cold-start-loading -f targets=develop,main,feature/another-feature
```

To preview merges without changing remote branches, add `-f dry_run=true`.
To watch the result, run `gh run watch` and select the promotion run. Dispatching
the command only starts the job; wait for success before assuming branches updated.

The workflow prepares every merge before one atomic push. A conflict, rejected
push, or branch rule fails the job without updating any destination. Resolve
conflicts on a branch and rerun. Branch protections are respected; repositories
requiring pull requests must use their approved PR flow. No forced updates or
automatic merging into all branches are used. Each target keeps its own history.

This workflow assumes you already tested the source; it does not run application
tests against the newly merged destinations. A dry run checks mergeability, not
remote write permissions. Promotions may trigger external deployment integrations.

The default `GITHUB_TOKEN` does not trigger other push-based GitHub Actions
workflows. If those checks or deployments are required, use an approved GitHub App
token or repository-scoped token stored as the `BRANCH_SYNC_TOKEN` Actions secret
with Contents write permission (and Workflows write if promoting workflow changes).
Never put a token in this YAML or your command. Repository rules still apply.

References: [manual workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow),
[GitHub CLI](https://cli.github.com/manual/gh_workflow_run).
