"""Merge one tested remote branch into explicit targets, then push atomically."""
import os
import subprocess
import tempfile
from pathlib import Path


def git(*args, cwd=None):
    return subprocess.check_output(
        ['git', '-c', 'core.hooksPath=/dev/null', *args],
        cwd=cwd, text=True, stderr=subprocess.STDOUT,
    ).strip()


def branch_name(value):
    value = value.strip()
    # Restrict inputs to literal branch names; never accept refspecs or wildcards.
    if not value or value.startswith('-') or value == 'HEAD':
        raise ValueError(f'Invalid branch name: {value!r}')
    git('check-ref-format', 'refs/heads/' + value)
    return value


def promote(source, targets, dry_run=False):
    source = branch_name(source)
    targets = list(dict.fromkeys(branch_name(name) for name in targets.split(',')))
    if source in targets:
        raise ValueError('The source cannot also be a destination.')
    # All refs must exist. Snapshot each branch once before preparing any merges.
    names = [source, *targets]
    git('fetch', '--no-tags', 'origin', *[
        f'+refs/heads/{name}:refs/remotes/origin/{name}' for name in names
    ])
    commits = {name: git('rev-parse', '--verify', f'refs/remotes/origin/{name}^{{commit}}') for name in names}
    source_sha = commits[source]
    print(f'Promoting {source} at {source_sha}', flush=True)
    refspecs = []
    summary = [f'Source: `{source}` (`{source_sha}`)', '']
    with tempfile.TemporaryDirectory(prefix='branch-promotion-') as directory:
        for index, target in enumerate(targets):
            worktree = str(Path(directory) / str(index))
            git('worktree', 'add', '--detach', worktree, commits[target])
            try:
                # Each destination receives only the source, not another target's changes.
                git('-c', 'user.name=github-actions[bot]',
                    '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com',
                    'merge', '--no-edit', source_sha, cwd=worktree)
                merged = git('rev-parse', 'HEAD', cwd=worktree)
                refspecs.append(f'{merged}:refs/heads/{target}')
                summary.append(f'- `{target}`: `{commits[target]}` → `{merged}`')
            finally:
                git('worktree', 'remove', '--force', worktree)
        # No force push. Conflicts, branch rules, or divergent concurrent updates
        # fail the entire operation; no earlier target is left partially promoted.
        if dry_run:
            print('Dry run: merges prepared; no branches pushed.', flush=True)
            summary.append('\nDry run only. Remote permissions were not tested.')
        else:
            print(git('push', '--atomic', 'origin', *refspecs), flush=True)
            summary.append('\nAll destination branches pushed successfully.')
    print('\n'.join(summary))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
            output.write('\n'.join(summary) + '\n')


if __name__ == '__main__':
    try:
        promote(os.environ['SOURCE_BRANCH'], os.environ.get('TARGET_BRANCHES', 'develop,main'),
                os.environ.get('DRY_RUN', 'false').lower() == 'true')
    except (ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(getattr(error, 'output', None) or str(error), flush=True)
        raise SystemExit(1)
