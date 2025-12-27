#!/usr/bin/env python3
"""
JayaApp Deployment Script

Intelligently syncs the JayaApp application to the GitHub Pages repository.
Parses both index.html and sw.js to determine which files are needed for deployment.
Uses git to track additions, modifications, and deletions.

Usage:
    python publish.py [--dry-run] [--commit] [--push]
"""

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Set, List

# Directories
SCRIPT_DIR = Path(__file__).parent.resolve()
SOURCE_DIR = SCRIPT_DIR
DEST_DIR = SCRIPT_DIR.parent / "jayaapp.github.io"

# Files/directories to always exclude from deployment
EXCLUDE_PATTERNS = {
    '.git', '.github', '.vscode', '.pytest_cache', '.claude', '.cursor',
    'config', 'tests', 'tools', 'sources',
    'server.py', 'server.sh', 'reset.sh', 'publish.py',
    '.gitignore', '.cursorindexingignore',
    '__pycache__', 'node_modules', '.specstory'
}

# Files to always include
ALWAYS_INCLUDE = {
    'index.html', 'manifest.json', 'sw.js',
    'LICENSE', 'HELP.md'
}

# Note orphaned destination files that should not be deleted
KEEP_FILES = {
    'README.md',  # Keep README.md in the Pages repo
    'reset'  # Git history reset script
}

def run_command(cmd: List[str], cwd: Path = None, check: bool = True) -> subprocess.CompletedProcess:
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd or DEST_DIR,
            capture_output=True,
            text=True,
            check=check
        )
        return result
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {' '.join(cmd)}", file=sys.stderr)
        print(f"stderr: {e.stderr}", file=sys.stderr)
        raise


def parse_service_worker(sw_file: Path) -> Set[str]:
    """Extract file paths from service worker CORE_FILES array."""
    files = set()
    content = sw_file.read_text(encoding='utf-8')
    
    # Find CORE_FILES array
    match = re.search(r'const CORE_FILES = \[(.*?)\];', content, re.DOTALL)
    if match:
        array_content = match.group(1)
        # Extract quoted strings (file paths)
        paths = re.findall(r"['\"]([^'\"]+)['\"]", array_content)
        for path in paths:
            # Remove leading slash and skip root
            if path and path != '/':
                files.add(path.lstrip('/'))
    
    return files


def parse_index_html(index_file: Path) -> Set[str]:
    """Extract file references from index.html (link, script, img tags)."""
    files = set()
    content = index_file.read_text(encoding='utf-8')
    
    # Find all href, src attributes pointing to local files
    patterns = [
        r'href=["\']([^"\']+\.(?:css|json|png|jpg|svg|ico))["\']',
        r'src=["\']([^"\']+\.(?:js|png|jpg|svg|ico))["\']',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            # Skip external URLs
            if match.startswith(('http://', 'https://', '//')):
                continue
            files.add(match.lstrip('/'))
    
    return files


def collect_data_files(data_dir: Path) -> Set[str]:
    """Collect all JSON files from data directory."""
    files = set()
    if data_dir.exists():
        for json_file in data_dir.glob('*.json'):
            files.add(f'data/{json_file.name}')
    return files


def collect_html_files(html_dir: Path) -> Set[str]:
    """Collect all HTML templates from the html directory."""
    files = set()
    if html_dir.exists():
        for html_file in html_dir.rglob('*.html'):
            # Store path relative to SOURCE_DIR with forward slashes
            files.add(str(html_file.relative_to(SOURCE_DIR)).replace('\\', '/'))
    return files


def collect_all_deployment_files() -> Set[str]:
    """Collect all files that should be deployed."""
    all_files = set()
    
    # Parse service worker
    sw_file = SOURCE_DIR / 'sw.js'
    if sw_file.exists():
        sw_files = parse_service_worker(sw_file)
        all_files.update(sw_files)
        print(f"Found {len(sw_files)} files in sw.js")
    
    # Parse index.html
    index_file = SOURCE_DIR / 'index.html'
    if index_file.exists():
        html_files = parse_index_html(index_file)
        all_files.update(html_files)
        print(f"Found {len(html_files)} files in index.html")
    
    # Add data files
    data_files = collect_data_files(SOURCE_DIR / 'data')
    all_files.update(data_files)
    print(f"Found {len(data_files)} files in data/")

    # Add html templates
    template_files = collect_html_files(SOURCE_DIR / 'html')
    all_files.update(template_files)
    print(f"Found {len(template_files)} files in html/")
    
    # Add always-include files
    all_files.update(ALWAYS_INCLUDE)
    
    return all_files


def should_exclude(path: Path) -> bool:
    """Check if a path should be excluded from deployment."""
    parts = path.parts
    for part in parts:
        if part in EXCLUDE_PATTERNS:
            return True
    return False


def sync_files(files: Set[str], dry_run: bool = False) -> None:
    """Sync files from source to destination directory."""
    if not DEST_DIR.exists():
        print(f"Error: Destination directory not found: {DEST_DIR}", file=sys.stderr)
        sys.exit(1)
    
    # Check if destination is a git repo
    if not (DEST_DIR / '.git').exists():
        print(f"Warning: Destination is not a git repository: {DEST_DIR}", file=sys.stderr)
    
    copied_count = 0
    skipped_count = 0
    
    for file_path in sorted(files):
        src = SOURCE_DIR / file_path
        dst = DEST_DIR / file_path
        
        if not src.exists():
            print(f"Warning: Source file not found: {file_path}")
            skipped_count += 1
            continue
        
        if should_exclude(Path(file_path)):
            print(f"Excluding: {file_path}")
            skipped_count += 1
            continue
        
        # Create parent directory if needed
        dst.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy file
        if dry_run:
            print(f"[DRY RUN] Would copy: {file_path}")
        else:
            shutil.copy2(src, dst)
            print(f"Copied: {file_path}")
        
        copied_count += 1
    
    print(f"\nCopied {copied_count} files, skipped {skipped_count}")


def clean_orphaned_files(deployed_files: Set[str], dry_run: bool = False) -> None:
    """Remove files from destination that are not in the deployment set."""
    if not DEST_DIR.exists():
        return
    
    removed_count = 0
    
    # Walk the destination directory
    for item in DEST_DIR.rglob('*'):
        if item.is_file():
            rel_path = item.relative_to(DEST_DIR)
            
            # Skip .git directory and README/LICENSE that belong to the Pages repo
            if '.git' in rel_path.parts:
                continue
            
            rel_path_str = str(rel_path).replace('\\', '/')
            
            # If this file is not in our deployment set, remove it
            # Note: README.md in the Pages repo is deliberately kept separate
            if rel_path_str not in deployed_files and rel_path_str not in KEEP_FILES:
                if dry_run:
                    print(f"[DRY RUN] Would remove orphaned file: {rel_path_str}")
                else:
                    item.unlink()
                    print(f"Removed orphaned file: {rel_path_str}")
                removed_count += 1
    
    # Remove empty directories
    for item in sorted(DEST_DIR.rglob('*'), reverse=True):
        if item.is_dir() and item.name != '.git':
            try:
                if not any(item.iterdir()):
                    if dry_run:
                        print(f"[DRY RUN] Would remove empty directory: {item.relative_to(DEST_DIR)}")
                    else:
                        item.rmdir()
                        print(f"Removed empty directory: {item.relative_to(DEST_DIR)}")
            except OSError:
                pass
    
    if removed_count > 0:
        print(f"\nRemoved {removed_count} orphaned files")


def git_stage_changes(dry_run: bool = False) -> None:
    """Stage all changes in the git repository."""
    if not (DEST_DIR / '.git').exists():
        print("Skipping git operations (not a git repository)")
        return
    
    if dry_run:
        print("\n[DRY RUN] Would run: git add -A")
        print("[DRY RUN] Would stage all changes (additions, modifications, deletions)")
    else:
        print("\nStaging changes with git...")
        run_command(['git', 'add', '-A'])
        
        # Show status
        result = run_command(['git', 'status', '--short'], check=False)
        if result.stdout:
            print("\nGit status:")
            print(result.stdout)
        else:
            print("No changes to stage")


def git_commit(message: str, dry_run: bool = False) -> None:
    """Commit staged changes."""
    if not (DEST_DIR / '.git').exists():
        return
    
    if dry_run:
        print(f"\n[DRY RUN] Would commit with message: {message}")
    else:
        # Check if there are changes to commit
        result = run_command(['git', 'diff', '--cached', '--quiet'], check=False)
        if result.returncode == 0:
            print("\nNo changes to commit")
            return
        
        print(f"\nCommitting changes...")
        run_command(['git', 'commit', '-m', message])
        print("Changes committed successfully")


def git_push(dry_run: bool = False) -> None:
    """Push commits to remote."""
    if not (DEST_DIR / '.git').exists():
        return
    
    if dry_run:
        print("\n[DRY RUN] Would push to remote repository")
    else:
        print("\nPushing to remote...")
        run_command(['git', 'push'])
        print("Pushed successfully")


def main():
    parser = argparse.ArgumentParser(
        description='Deploy JayaApp to GitHub Pages repository',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without actually doing it'
    )
    parser.add_argument(
        '--commit',
        action='store_true',
        help='Commit changes after staging (requires a git repository)'
    )
    parser.add_argument(
        '--push',
        action='store_true',
        help='Push commits to remote (implies --commit)'
    )
    parser.add_argument(
        '--message', '-m',
        default='Deploy JayaApp updates',
        help='Commit message (default: "Deploy JayaApp updates")'
    )
    
    args = parser.parse_args()
    
    # Push implies commit
    if args.push:
        args.commit = True
    
    print("=" * 60)
    print("JayaApp Deployment Script")
    print("=" * 60)
    print(f"Source: {SOURCE_DIR}")
    print(f"Destination: {DEST_DIR}")
    if args.dry_run:
        print("\n*** DRY RUN MODE - No changes will be made ***\n")
    print()
    
    # Collect all files to deploy
    print("Collecting deployment files...")
    deployment_files = collect_all_deployment_files()
    print(f"\nTotal files to deploy: {len(deployment_files)}\n")
    
    # Sync files
    print("Syncing files...")
    sync_files(deployment_files, dry_run=args.dry_run)
    
    # Clean orphaned files
    print("\nCleaning orphaned files...")
    clean_orphaned_files(deployment_files, dry_run=args.dry_run)
    
    # Git operations
    git_stage_changes(dry_run=args.dry_run)
    
    if args.commit:
        git_commit(args.message, dry_run=args.dry_run)
    
    if args.push:
        git_push(dry_run=args.dry_run)
    
    print("\n" + "=" * 60)
    if args.dry_run:
        print("DRY RUN COMPLETE - No changes were made")
    else:
        print("DEPLOYMENT COMPLETE")
        if not args.commit:
            print("\nNext steps:")
            print(f"  cd {DEST_DIR}")
            print("  git status")
            print("  git commit -m 'Deploy updates'")
            print("  git push")
    print("=" * 60)


if __name__ == '__main__':
    main()
