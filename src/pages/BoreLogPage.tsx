import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { AccordionSection } from '../components/AccordionSection';
import { NumberField, SelectField, Field } from '../components/FormFields';
import { boreLogService, lookupService } from '../services/boreLogService';
import { authService } from '../services/authService';
import { BoreLogEntry, Project, Personnel, Rig, emptyBoreLog } from '../types';

export const BoreLogPage: React.FC = () => {
  const { projectId: projectIdParam, pileNo: pileNoParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const projectId = parseInt(projectIdParam || '0', 10);
  const pileNo = decodeURIComponent(pileNoParam || '');

  const [entry, setEntry] = useState<BoreLogEntry>(emptyBoreLog(projectId, pileNo));
  const navigationState = location.state as { selectedProjectName?: string } | null;
  const [project, setProject] = useState<Project | null>(
    navigationState?.selectedProjectName
      ? { id: projectId, name: navigationState.selectedProjectName, clientName: '' }
      : null
  );
  const [rigs, setRigs] = useState<Rig[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Personnel filtered by role
  const operators = useMemo(() => personnel.filter((p) => p.role === 'Operator'), [personnel]);
  const supervisors = useMemo(() => personnel.filter((p) => p.role === 'Supervisor'), [personnel]);
  const liners = useMemo(() => personnel.filter((p) => p.role === 'Liner'), [personnel]);
  const fitters = useMemo(() => personnel.filter((p) => p.role === 'Fitter'), [personnel]);
  const muckRemovers = useMemo(() => personnel.filter((p) => p.role === 'MuckRemover'), [personnel]);
  const labourers = useMemo(() => personnel.filter((p) => p.role === 'Labour'), [personnel]);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const currentUserId = authService.getCurrentUserId();
        if (!currentUserId) {
          navigate('/login');
          return;
        }

        const [rigList, personnelList, projects, existing] = await Promise.all([
          lookupService.getRigs(projectId, new Date().toISOString().slice(0, 10)),
          lookupService.getPersonnel(projectId),
          boreLogService.getProjects(currentUserId),
          boreLogService.getPileEntry(projectId, pileNo),
        ]);
        setRigs(rigList);
        setPersonnel(personnelList);
        setProject(projects.find((p) => p.id === projectId) || null);
        if (existing) {
          setEntry(existing);
        } else {
          setEntry(emptyBoreLog(projectId, pileNo));
        }
      } catch (err) {
        console.error('Failed to load form data', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, pileNo]);

  // Generic field updater
  const update = <K extends keyof BoreLogEntry>(key: K, value: BoreLogEntry[K]) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
  };

  // Completeness checks for accordion checkmarks
  const generalComplete = entry.dateOfBoringStarted && entry.dateOfConcreted && entry.rotaryRigId > 0;
  const boreComplete = entry.soilBore > 0 || entry.rockBore > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        setSaveError('Session expired. Please login again.');
        navigate('/login');
        return;
      }

      const result = await boreLogService.save({
        ...entry,
        webOprId: currentUserId,
        isCompleted: true,
      });

      if (!result.isSuccess) {
        setSaveError(result.msg || 'Failed to save.');
        return;
      }

      setSaveSuccess(result.msg || 'Saved successfully.');
      window.setTimeout(() => navigate('/find-pile'), 1000);
    } catch (err) {
      console.error('Submit failed', err);
      setSaveError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="screen active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--muted)' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div id="borelog" className="screen active">
      <PageHeader crumb="New Entry" title="Bore Log" backTo="/find-pile" />
      {saveSuccess && <div className="toast-success">{saveSuccess}</div>}

      <div className="scroll-area">
        {/* Active context strip */}
        <div className="context-strip" onClick={() => navigate('/find-pile')}>
          <div className="cs-left">
            <div className="cs-pile">{entry.pileNo}</div>
            <div className="cs-meta">
              <span>{project?.name || 'Loading…'}</span>
            </div>
          </div>
          <div className="cs-right">
            <span className="cs-change">CHANGE</span>
          </div>
        </div>

        {/* Section 01: General Details */}
        <AccordionSection
          num="01"
          title="General Details"
          subtitle="Dates · Rotary Rig"
          isComplete={!!generalComplete}
          defaultOpen
        >
          <div className="pair">
            <Field label="Boring Started" required>
              <input
                type="date"
                value={entry.dateOfBoringStarted}
                onChange={(e) => update('dateOfBoringStarted', e.target.value)}
              />
            </Field>
            <Field label="Concreted On" required>
              <input
                type="date"
                value={entry.dateOfConcreted}
                onChange={(e) => update('dateOfConcreted', e.target.value)}
              />
            </Field>
          </div>
          <SelectField
            label="Rotary Rig"
            required
            options={rigs.map((r) => ({ id: r.id, name: `${r.code}` }))}
            value={entry.rotaryRigId}
            onChange={(v) => update('rotaryRigId', v)}
          />
        </AccordionSection>

        {/* Section 02: Bore Measurements */}
        <AccordionSection
          num="02"
          title="Bore Measurements"
          subtitle="Soil · Rock · Socket"
          isComplete={boreComplete}
        >
          <div className="pair">
            <NumberField
              label="Soil Bore"
              required
              value={entry.soilBore}
              onChange={(v) => update('soilBore', v)}
            />
            <NumberField
              label="Rock Bore"
              required
              value={entry.rockBore}
              onChange={(v) => update('rockBore', v)}
            />
            <NumberField
              label="Soft Rock"
              value={entry.softRock}
              onChange={(v) => update('softRock', v)}
            />
            <NumberField
              label="Rock Socket"
              value={entry.rockSocket}
              onChange={(v) => update('rockSocket', v)}
            />
          </div>
        </AccordionSection>

        {/* Section 03: Liner & Reference Levels */}
        <AccordionSection
          num="03"
          title="Liner & Reference Levels"
          subtitle="Casing, EGL, post-concrete"
          defaultOpen
        >
          <div className="group-label">Liner &amp; Casing</div>
          <div className="pair">
            <NumberField label="Liner Length" value={entry.linerLength} onChange={(v) => update('linerLength', v)} />
            <NumberField label="Casing Length" value={entry.casingLength} onChange={(v) => update('casingLength', v)} />
            <NumberField label="Actual" value={entry.actualLength} onChange={(v) => update('actualLength', v)} />
            <NumberField label="Casing Top" value={entry.casingTop} onChange={(v) => update('casingTop', v)} />
          </div>

          <div className="group-label">Reference Levels</div>
          <NumberField label="[A] EGL — Existing Ground Level" value={entry.egl} onChange={(v) => update('egl', v)} />
          <NumberField
            label="Empty Bore (After Concrete)"
            value={entry.emptyBoreAfterConcrete}
            onChange={(v) => update('emptyBoreAfterConcrete', v)}
          />
          <NumberField
            label="Concrete Bore (After Concrete)"
            value={entry.concreteBoreAfterConcrete}
            onChange={(v) => update('concreteBoreAfterConcrete', v)}
          />

          <div className="group-label">Time &amp; Depth Log</div>
          <div className="td-block">
            <div className="td-title">
              Soil Bore <span className="badge">From → To</span>
            </div>
            <div className="td-row">
              <div className="lab">Time</div>
              <input type="time" value={entry.soilBoreTimeFrom} onChange={(e) => update('soilBoreTimeFrom', e.target.value)} />
              <input type="time" value={entry.soilBoreTimeTo} onChange={(e) => update('soilBoreTimeTo', e.target.value)} />
            </div>
            <div className="td-row">
              <div className="lab">Depth</div>
              <input
                type="number"
                step="0.001"
                value={entry.soilBoreDepthFrom}
                onChange={(e) => update('soilBoreDepthFrom', parseFloat(e.target.value) || 0)}
                inputMode="decimal"
              />
              <input
                type="number"
                step="0.001"
                value={entry.soilBoreDepthTo}
                onChange={(e) => update('soilBoreDepthTo', parseFloat(e.target.value) || 0)}
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="td-block">
            <div className="td-title">
              Rock Bore <span className="badge">From → To</span>
            </div>
            <div className="td-row">
              <div className="lab">Time</div>
              <input type="time" value={entry.rockBoreTimeFrom} onChange={(e) => update('rockBoreTimeFrom', e.target.value)} />
              <input type="time" value={entry.rockBoreTimeTo} onChange={(e) => update('rockBoreTimeTo', e.target.value)} />
            </div>
            <div className="td-row">
              <div className="lab">Depth</div>
              <input
                type="number"
                step="0.001"
                value={entry.rockBoreDepthFrom}
                onChange={(e) => update('rockBoreDepthFrom', parseFloat(e.target.value) || 0)}
                inputMode="decimal"
              />
              <input
                type="number"
                step="0.001"
                value={entry.rockBoreDepthTo}
                onChange={(e) => update('rockBoreDepthTo', parseFloat(e.target.value) || 0)}
                inputMode="decimal"
              />
            </div>
          </div>
        </AccordionSection>

        {/* Section 04: Site Personnel */}
        <AccordionSection num="04" title="Site Personnel" subtitle="Operator, supervisor, crew">
          <SelectField label="Machine Operator" options={operators} value={entry.operatorId} onChange={(v) => update('operatorId', v)} />
          <SelectField label="Liner/Bender" options={liners} value={entry.linerId} onChange={(v) => update('linerId', v)} />
          <SelectField label="Fitter" options={fitters} value={entry.fitterId} onChange={(v) => update('fitterId', v)} />
        </AccordionSection>

        {/* Section 05: Remarks */}
        <AccordionSection num="05" title="Remarks" subtitle="Site notes &amp; observations">
          <Field label="Remarks">
            <textarea
              rows={5}
              placeholder="Add observations…"
              value={entry.remarks}
              onChange={(e) => update('remarks', e.target.value)}
            />
          </Field>
        </AccordionSection>

        {/* Submit */}
        <div className="action-area">
          {saveError && <div className="error-msg">{saveError}</div>}
          <button className="btn-save" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Save & Submit →'}
          </button>
        </div>
      </div>

    </div>
  );
};
