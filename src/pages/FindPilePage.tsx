import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { boreLogService } from '../services/boreLogService';
import { authService } from '../services/authService';
import { Project, PileRecentEntry } from '../types';
import { PageHeader } from '../components/PageHeader';

export const FindPilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recent, setRecent] = useState<PileRecentEntry[]>([]);
  const [projectId, setProjectId] = useState<number>(0);
  const [pileNo, setPileNo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let currentUserId = authService.getCurrentUserId();
        const navState = location.state as { userId?: number | null } | null;

        // Fallback for environments where storage write is delayed/blocked.
        if (!currentUserId && navState?.userId) {
          currentUserId = navState.userId;
          localStorage.setItem(
            'borelog_user',
            JSON.stringify({ id: currentUserId, isSucess: true, msg: 'Login Success' })
          );
        }

        if (!currentUserId) {
          setError('User session not found. Please login again.');
          return;
        }

        const projs = await boreLogService.getProjects(currentUserId);
        setProjects(projs);
        if (projs.length > 0) setProjectId(projs[0].id);

        try {
          const rec = await boreLogService.getRecentPiles();
          setRecent(rec);
        } catch (recentErr) {
          console.warn('Recent piles not available', recentErr);
          setRecent([]);
        }
      } catch (err) {
        console.error('Failed to load projects', err);
        setError('Failed to load projects. Please try again.');
      }
    })();
  }, [location.state]);

  const handleUpdate = async () => {
    if (!projectId || !pileNo.trim()) {
      setError('Please select a project and enter a pile number');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const trimmedPileNo = pileNo.trim();
      const validation = await boreLogService.validatePileNo(projectId, trimmedPileNo);

      if (!validation.isSuccess) {
        setError(validation.msg || 'Pile validation failed.');
        return;
      }

      const selectedProject = projects.find((p) => p.id === projectId);
      navigate(`/borelog/${projectId}/${encodeURIComponent(trimmedPileNo)}`, {
        state: {
          selectedProjectName: selectedProject?.name ?? '',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const openRecent = (item: PileRecentEntry) => {
    const proj = projects.find((p) => p.name === item.projectName);
    if (proj) {
      navigate(`/borelog/${proj.id}/${encodeURIComponent(item.pileNo)}`, {
        state: {
          selectedProjectName: proj.name,
        },
      });
    }
  };

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hrs = Math.floor(diff / 3_600_000);
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div id="matrix" className="screen active">
      <PageHeader crumb="Bore Log System" title="Find Pile" backTo="/login" />

      <div className="lookup-body">
        <div className="lookup-card">
          <div className="lookup-eyebrow">
            <span className="pill-tag">Step 01</span>
            <span className="lookup-eyebrow-text">Select project &amp; pile</span>
          </div>

          <h2 className="lookup-title">Which pile would you like to update?</h2>
          <p className="lookup-sub">
            Choose your project, then enter the pile number to begin entering bore log data.
          </p>

          <div className="f" style={{ marginTop: 22 }}>
            <label>
              Project <span className="req">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(parseInt(e.target.value, 10))}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="f">
            <label>
              Pile No. <span className="req">*</span>
            </label>
            <input
              type="text"
              className="pile-input"
              placeholder="e.g. P-247"
              value={pileNo}
              onChange={(e) => setPileNo(e.target.value)}
              autoComplete="off"
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
            />
            <div className="input-hint">Enter the pile number you wish to update</div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button className="btn-update" onClick={handleUpdate} disabled={loading}>
            {loading ? 'Loading…' : 'Update Data →'}
          </button>
        </div>

        {recent.length > 0 && (
          <div className="recent-section">
            <div className="recent-head">Recently accessed</div>
            <div className="recent-list">
              {recent.map((item) => (
                <button
                  key={item.pileNo + item.lastUpdatedAt}
                  className="recent-item"
                  onClick={() => openRecent(item)}
                >
                  <span className="r-num">{item.pileNo}</span>
                  <span className="r-time">{formatRelative(item.lastUpdatedAt)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
