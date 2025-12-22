"""
Test coverage check utilities
Ensures SonarQube can detect Python coverage properly
"""

import pytest
from app.utils.coverage_check import add_numbers, check_status, process_list


class TestAddNumbers:
    """Test the add_numbers function."""

    def test_add_positive_numbers(self):
        """Test adding two positive numbers."""
        result = add_numbers(2, 3)
        assert result == 5

    def test_add_negative_numbers(self):
        """Test adding negative numbers."""
        result = add_numbers(-2, -3)
        assert result == -5

    def test_add_zero(self):
        """Test adding with zero."""
        result = add_numbers(0, 5)
        assert result == 5


class TestCheckStatus:
    """Test the check_status function."""

    def test_status_active(self):
        """Test when status is active."""
        result = check_status(True)
        assert result == "active"

    def test_status_inactive(self):
        """Test when status is inactive."""
        result = check_status(False)
        assert result == "inactive"


class TestProcessList:
    """Test the process_list function."""

    def test_process_empty_list(self):
        """Test processing an empty list."""
        result = process_list([])
        assert result == 0

    def test_process_single_item(self):
        """Test processing a list with one item."""
        result = process_list([1])
        assert result == 1

    def test_process_multiple_items(self):
        """Test processing a list with multiple items."""
        result = process_list([1, 2, 3, 4, 5])
        assert result == 5
