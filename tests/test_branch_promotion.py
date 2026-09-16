"""Integration checks against temporary local Git repositories; no GitHub writes."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/promote_branch.py'


class PromotionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.remote = self.root / 'remote.git'
        self.repo = self.root / 'repo'
        self.git('init', '--bare', str(self.remote), cwd=self.root)
        self.git('init', '-b', 'main', str(self.repo), cwd=self.root)
        self.git('config', 'user.name', 'Test')
        self.git('config', 'user.email', 'test@example.test')
        self.commit('shared.txt', 'base')
        self.git('branch', 'develop')
        self.git('switch', '-c', 'feature/test')
        self.commit('shared.txt', 'feature')
        self.git('remote', 'add', 'origin', str(self.remote))
        self.git('push', 'origin', 'main', 'develop', 'feature/test')

    def git(self, *args, cwd=None):
        return subprocess.check_output(['git', *args], cwd=cwd or self.repo,
                                       text=True, stderr=subprocess.STDOUT).strip()

    def commit(self, name, content):
        (self.repo / name).write_text(content)
        self.git('add', name)
        self.git('commit', '-m', content)

    def refs(self):
        return self.git('show-ref', '--heads', cwd=self.remote)

    def run_promotion(self, **extra):
        env = {**os.environ, 'SOURCE_BRANCH': 'feature/test',
               'TARGET_BRANCHES': 'develop,main', 'DRY_RUN': 'false', **extra}
        env.pop('GITHUB_STEP_SUMMARY', None)
        return subprocess.run(['python3', str(SCRIPT)], cwd=self.repo, env=env,
                              text=True, capture_output=True)

    def test_all_targets_receive_source_and_keep_their_own_changes(self):
        self.git('switch', 'develop')
        self.commit('develop-only.txt', 'keep me')
        self.git('push', 'origin', 'develop')
        result = self.run_promotion()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        for target in ['main', 'develop']:
            self.assertEqual(self.git('show', target + ':shared.txt', cwd=self.remote), 'feature')
        self.assertEqual(self.git('show', 'develop:develop-only.txt', cwd=self.remote), 'keep me')
        self.assertNotIn('develop-only.txt', self.git('ls-tree', '--name-only', 'main', cwd=self.remote))
        # A repeat run should be harmless.
        before = self.refs()
        self.assertEqual(self.run_promotion().returncode, 0)
        self.assertEqual(before, self.refs())

    def test_later_conflict_does_not_push_an_earlier_target(self):
        self.git('switch', 'main')
        self.commit('shared.txt', 'conflicting main')
        self.git('push', 'origin', 'main')
        before = self.refs()
        self.assertNotEqual(self.run_promotion().returncode, 0)
        self.assertEqual(before, self.refs())

    def test_rejected_target_keeps_every_remote_branch_unchanged(self):
        hook = self.remote / 'hooks/update'
        hook.write_text('#!/bin/sh\n[ "$1" != "refs/heads/main" ]\n')
        hook.chmod(0o755)
        before = self.refs()
        self.assertNotEqual(self.run_promotion().returncode, 0)
        self.assertEqual(before, self.refs())

    def test_dry_run_and_invalid_inputs_do_not_change_remote_branches(self):
        before = self.refs()
        self.assertEqual(self.run_promotion(DRY_RUN='true').returncode, 0)
        for targets in ['develop,missing', 'develop,*', 'develop,feature/test', 'develop,']:
            self.assertNotEqual(self.run_promotion(TARGET_BRANCHES=targets).returncode, 0)
        self.assertEqual(before, self.refs())


if __name__ == '__main__':
    unittest.main()
