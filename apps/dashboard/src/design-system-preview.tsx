// design-system-preview.tsx
import React, { useState } from 'react';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { Button } from './components/primitives/Button';
import { IconButton } from './components/primitives/IconButton';
import { Badge } from './components/primitives/Badge';
import { StatusBadge } from './components/primitives/StatusBadge';
import { Card } from './components/primitives/Card';
import { Divider } from './components/primitives/Divider';
import { Tabs } from './components/primitives/Tabs';
import { Tooltip } from './components/primitives/Tooltip';
import { TextInput } from './components/primitives/TextInput';
import { Select } from './components/primitives/Select';
import { Checkbox } from './components/primitives/Checkbox';
import { Switch } from './components/primitives/Switch';
import { TableShell } from './components/primitives/TableShell';
import { EmptyState } from './components/primitives/EmptyState';
import { InlineAlert } from './components/primitives/InlineAlert';
import { LoadingSkeleton } from './components/primitives/LoadingSkeleton';
import { ModalShell } from './components/primitives/ModalShell';
import { DrawerShell } from './components/primitives/DrawerShell';

import { ProjectHealthIndicator } from './components/status/ProjectHealthIndicator';
import { EvidenceStatus } from './components/evidence/EvidenceStatus';
import { ConfidenceMeter } from './components/evidence/ConfidenceMeter';
import { RiskBadge } from './components/status/RiskBadge';
import { ApprovalStatus } from './components/status/ApprovalStatus';
import { ValidationResult } from './components/status/ValidationResult';
import { DiffFileHeader } from './components/evidence/DiffFileHeader';
import { EventTimelineItem } from './components/status/EventTimelineItem';
import { ConnectionStatus } from './components/status/ConnectionStatus';
import { DiagnosticMessage } from './components/feedback/DiagnosticMessage';
import { ManagedArtifactStatus } from './components/status/ManagedArtifactStatus';
import { WorkflowStepIndicator } from './components/status/WorkflowStepIndicator';

import { ApplicationShell } from './components/layout/ApplicationShell';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ContentHeader } from './components/layout/ContentHeader';
import { ResponsiveGrid } from './components/layout/ResponsiveGrid';
import { CommandBar } from './components/layout/CommandBar';

export function DesignSystemPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(true);

  const sampleTableData = [
    { id: '1', name: 'Artifact Alpha', type: 'Policy', state: 'active' as const },
    { id: '2', name: 'Rule Beta', type: 'Schema', state: 'passed' as const },
    { id: '3', name: 'Trace Gamma', type: 'Telemetry', state: 'failed' as const }
  ];

  return (
    <ApplicationShell
      topBar={<TopBar title="Technical Governance Control Plane — Design System Preview" />}
      sidebar={
        <Sidebar>
          <div style={{ color: 'var(--ds-color-fg-muted)', fontSize: '0.875rem' }}>
            <div style={{ marginBottom: '12px', fontWeight: 600 }}>NAV SECTIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span>▶ Governance</span>
              <span>▶ Telemetry</span>
              <span>▶ Control Plane</span>
              <span>▶ Configuration</span>
            </div>
          </div>
        </Sidebar>
      }
    >
      <ContentHeader
        title="Design System Component Showcase"
        description="Standalone technical governance primitives and control-plane components preview."
        actions={<Button onClick={() => setModalOpen(true)}>Open Modal</Button>}
      />

      <CommandBar placeholder="Filter tokens or components..." actions={<Button size="sm" variant="secondary" onClick={() => setDrawerOpen(true)}>Open Inspector Drawer</Button>} />

      <ResponsiveGrid>
        <Card>
          <h3 style={{ marginTop: 0 }}>Buttons & Actions</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <IconButton label="Settings" symbol="⚙" size="md" />
            <IconButton label="Filter" symbol="🔍" size="md" />
            <IconButton label="Refresh" symbol="🔄" size="md" />
          </div>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>State Semantics & Badges</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <StatusBadge status="observed" />
            <StatusBadge status="inferred" />
            <StatusBadge status="unresolved" />
            <StatusBadge status="recommended" />
            <StatusBadge status="proposed" />
            <StatusBadge status="approved" />
            <StatusBadge status="active" />
            <StatusBadge status="failed" />
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <RiskBadge level="low" />
            <RiskBadge level="medium" />
            <RiskBadge level="high" />
            <RiskBadge level="critical" />
          </div>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>Form Controls</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <TextInput label="Governance Endpoint" placeholder="https://controlplane.internal/api" />
            <Select label="Policy Mode" options={[{ label: 'Strict Enforcement', value: 'strict' }, { label: 'Audit Only', value: 'audit' }]} />
            <Checkbox label="Enable background telemetry scanning" />
            <Switch label="Active Monitoring" checked={switchChecked} onChange={setSwitchChecked} />
          </div>
        </Card>
      </ResponsiveGrid>

      <div style={{ marginTop: '24px' }}>
        <Tabs
          items={[
            {
              id: 'control-plane',
              label: 'Control-Plane Components',
              content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <ProjectHealthIndicator status="active" scoreText="99.4% SLA" />
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <EvidenceStatus type="observed" count={12} />
                    <EvidenceStatus type="inferred" count={4} />
                    <EvidenceStatus type="unresolved" count={1} />
                  </div>
                  <ConfidenceMeter value={88} />
                  <ApprovalStatus state="approved" approver="sec-admin@org.internal" />
                  <ValidationResult status="passed" ruleName="SEC-04-AUTH" details="Authentication token rotation policy verified." />
                  <DiffFileHeader filePath="configs/governance.json" changeType="modified" additions={14} deletions={3} />
                  <ConnectionStatus connected={true} endpoint="daemon-rpc.internal:9090" />
                  <DiagnosticMessage code="WARN-802" message="High latency detected on secondary telemetry link." severity="warning" />
                  <ManagedArtifactStatus name="SchemaDefinition" version="1.4.0" synced={true} />
                  <WorkflowStepIndicator
                    steps={[
                      { id: '1', name: 'Scan', status: 'passed' },
                      { id: '2', name: 'Verify', status: 'passed' },
                      { id: '3', name: 'Enforce', status: 'active' }
                    ]}
                  />
                </div>
              )
            },
            {
              id: 'table',
              label: 'Data Table Shell',
              content: (
                <TableShell
                  columns={[
                    { key: 'id', header: 'ID', render: (item) => item.id },
                    { key: 'name', header: 'Name', render: (item) => item.name },
                    { key: 'type', header: 'Type', render: (item) => item.type },
                    { key: 'state', header: 'Status', render: (item) => <StatusBadge status={item.state} /> }
                  ]}
                  data={sampleTableData}
                  keyExtractor={(item) => item.id}
                />
              )
            },
            {
              id: 'feedback',
              label: 'Feedback & Skeletons',
              content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <InlineAlert variant="info" title="System Notice">
                    Governance rules engine updated successfully.
                  </InlineAlert>
                  <LoadingSkeleton count={3} height="20px" />
                  <EmptyState title="No Anomalies Found" description="All telemetry signals are within normal operating bounds." />
                </div>
              )
            }
          ]}
        />
      </div>

      <ModalShell isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Governance Configuration Modal">
        <p>This is a standalone accessible modal shell component.</p>
        <TextInput label="Configuration Key" placeholder="CONFIG_ENTRY" />
      </ModalShell>

      <DrawerShell isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Inspector Panel Drawer">
        <p>Detailed technical telemetry inspector drawer view.</p>
        <DiagnosticMessage code="INFO-101" message="Telemetry stream active." severity="info" />
      </DrawerShell>
    </ApplicationShell>
  );
}
