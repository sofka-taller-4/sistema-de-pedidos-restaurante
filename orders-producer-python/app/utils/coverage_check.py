"""
Simple coverage check utility
This module helps verify that SonarQube is detecting Python test coverage
"""


def add_numbers(a: int, b: int) -> int:
    """Add two numbers and return the result."""
    return a + b


def check_status(is_active: bool) -> str:
    """Check status and return corresponding message."""
    if is_active:
        return "active"
    return "inactive"


def process_list(items: list) -> int:
    """Process a list and return its length."""
    if not items:
        return 0
    return len(items)
