"""Audit this repository against the pngdeity template standard."""

import os
import sys


EXPECTED_LANGUAGES = ["typescript"]
EXPECTED_CI_PROVIDER = "github"

REQUIRED_ROOT_FILES = [
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "TASKS.md",
]

LANG_SPECIFIC_FILES = {
    "python": ["pyproject.toml"],
    "typescript": ["package.json"],
    "javascript": ["package.json"],
    "go": [".golangci.yml", ".go-version", "go.mod"],
    "rust": ["rustfmt.toml", "rust-toolchain.toml", "Cargo.toml"],
    "dotnet": ["global.json", "Directory.Build.props", "NuGet.config", "Directory.Packages.props", "OpencodeRtk.csproj"],
    "tofu": [
        ".tflint.hcl",
        ".terraform-docs.yml",
        "versions.tf",
        "main.tf",
        "variables.tf",
        "outputs.tf",
        "backend.tf",
        ".env.example",
    ],
}

CI_SPECIFIC_FILES = {
"github": [
        ".github/workflows/verify-signed-commits.yml",
        ".github/workflows/check-template-update.yml",
        ".github/dependabot.yml",
        ".github/PULL_REQUEST_TEMPLATE.md",
        ".github/ISSUE_TEMPLATE/bug_report.yml",
        ".github/ISSUE_TEMPLATE/feature_request.yml",
        ".github/ISSUE_TEMPLATE/config.yml",
".github/workflows/tasks-lint.yml",
        ".github/workflows/node.yml",
        ".github/workflows/publish.yml",
    ],
}

LANG_DIRECTORIES = {
    "typescript": ["src", "tests"],
    "javascript": ["src", "tests"],
    "rust": ["src", "tests"],
    "dotnet": ["src", "tests"],
}

REQUIRED_DIRS = ["docs", "scripts"]


def audit(repo_root="."):
    issues = []

    for f in REQUIRED_ROOT_FILES:
        if not os.path.exists(os.path.join(repo_root, f)):
            issues.append(f"Missing root file: {f}")

    for lang in EXPECTED_LANGUAGES:
        for f in LANG_SPECIFIC_FILES.get(lang, []):
            if not os.path.exists(os.path.join(repo_root, f)):
                issues.append(f"Missing {lang} config: {f}")

    for f in CI_SPECIFIC_FILES.get(EXPECTED_CI_PROVIDER, []):
        if not os.path.exists(os.path.join(repo_root, f)):
            issues.append(f"Missing CI config: {f}")


    for d in REQUIRED_DIRS:
        if not os.path.isdir(os.path.join(repo_root, d)):
            issues.append(f"Missing directory: {d}/")

    seen_dirs = set(REQUIRED_DIRS)
    for lang in EXPECTED_LANGUAGES:
        for d in LANG_DIRECTORIES.get(lang, []):
            if d not in seen_dirs:
                seen_dirs.add(d)
                if not os.path.isdir(os.path.join(repo_root, d)):
                    issues.append(f"Missing {lang} directory: {d}/")

    total_checks = (
        len(REQUIRED_ROOT_FILES)
        + sum(len(LANG_SPECIFIC_FILES.get(l, [])) for l in EXPECTED_LANGUAGES)
        + len(CI_SPECIFIC_FILES.get(EXPECTED_CI_PROVIDER, []))
        + len(REQUIRED_DIRS)
        + sum(len(LANG_DIRECTORIES.get(l, [])) for l in EXPECTED_LANGUAGES)
    )

    score = total_checks - len(issues)
    ratio = score / total_checks if total_checks > 0 else 1.0
    grade = (
        "A" if ratio >= 0.95
        else "B" if ratio >= 0.80
        else "C" if ratio >= 0.60
        else "D"
    )

    return {"grade": grade, "score": f"{score}/{total_checks}", "ratio": ratio, "issues": issues}


if __name__ == "__main__":
    result = audit(".")
    print(f"Grade: {result['grade']} ({result['score']}, {result['ratio']:.0%})")
    if result["issues"]:
        print()
        for issue in result["issues"]:
            print(f"  - {issue}")
    sys.exit(0 if result["grade"] == "A" else 1)
