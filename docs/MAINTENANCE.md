# MAINTENANCE.md

## Overview

mcgill.courses relies heavily on scraped data as McGill does not provide any
open APIs for course information. This document outlines the steps required to
maintain and update the data for mcgill.courses regularly. Performing these
steps together ensures data integrity and provides the most up-to-date course
information for users.

The following tasks must be completed:

- Parse courses from mcgill.ca and VSB.

- Parse course requisite trees using an LLM.

- Parse course averages from the McGill Enhanced Google Sheets.

- Update the search index data.

The above should be done **at least once per semester**, but it is encouraged to
be done more often due to the ever changing nature of McGill's course offerings.
