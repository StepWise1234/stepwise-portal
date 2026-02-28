
export function Settings() {
  return (
    <div className="page settings">
      <header className="page-header">
        <h1>Settings</h1>
        <p className="subtitle">Configure your admin dashboard</p>
      </header>

      <section className="card">
        <h3>Email Settings</h3>
        <p className="description">Email is configured through Proton Mail Bridge on the server.</p>
        <div className="fields-grid">
          <div className="field readonly">
            <label>Provider</label>
            <span>Proton Mail (via IMAP/SMTP Bridge)</span>
          </div>
          <div className="field readonly">
            <label>Email Address</label>
            <span>stepwisetraining@proton.me</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Database</h3>
        <p className="description">Connected to Supabase</p>
        <div className="fields-grid">
          <div className="field readonly">
            <label>Project URL</label>
            <span>ybludwecmqghoheotzzz.supabase.co</span>
          </div>
          <div className="field readonly">
            <label>Status</label>
            <span className="status-indicator connected">Connected</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Pipeline Stages</h3>
        <p className="description">The pipeline stages used to track applicants</p>
        <ol className="stages-list">
          <li><span className="stage-dot" style={{ background: '#94a3b8' }}></span> Lead</li>
          <li><span className="stage-dot" style={{ background: '#f59e0b' }}></span> Chemistry Call</li>
          <li><span className="stage-dot" style={{ background: '#3b82f6' }}></span> Application</li>
          <li><span className="stage-dot" style={{ background: '#8b5cf6' }}></span> Interview</li>
          <li><span className="stage-dot" style={{ background: '#ec4899' }}></span> Approval</li>
          <li><span className="stage-dot" style={{ background: '#10b981' }}></span> Payment</li>
          <li><span className="stage-dot" style={{ background: '#06b6d4' }}></span> Onboarding</li>
          <li><span className="stage-dot" style={{ background: '#22c55e' }}></span> Complete</li>
        </ol>
      </section>

      <section className="card">
        <h3>About</h3>
        <p className="description">StepWise Admin Dashboard v2.0</p>
        <p className="description">Built with React + TypeScript + Supabase</p>
      </section>
    </div>
  )
}
