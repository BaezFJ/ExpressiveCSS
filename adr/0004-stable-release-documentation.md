# Public documentation follows stable framework releases

Status: accepted

The main site must describe a version users can install through npm's `latest`
tag. Publishing from every push can advertise unpublished or failed releases.

## Decision

Retain the Astro build and artifact deployment from ADR 0003. Replace the push
trigger with a reusable documentation workflow called only after successful
stable framework publication. Build the exact tagged commit, verify its ancestry
on protected master, and recheck npm latest immediately before deployment.

Serialize the complete release workflow through publication and documentation
deployment. This prevents releases through this workflow from changing latest
between the documentation check and deployment. Registry errors fail closed;
a superseded version skips deployment. Changes made manually to npm dist-tags
outside this workflow require maintainer coordination.

MCP releases and prereleases do not deploy the stable site. Contributors use
local previews and CI artifacts for unreleased documentation. Documentation-only
fixes reach the site through a patch release. No generated site files are committed.

## Consequences

The site remains on its previous version if publication fails. A successful
package publish followed by a failed docs deployment can be recovered by rerunning
only failed jobs in that release run. Do not rerun its successful publish job or
create a replacement tag. No separate public development site is maintained.
