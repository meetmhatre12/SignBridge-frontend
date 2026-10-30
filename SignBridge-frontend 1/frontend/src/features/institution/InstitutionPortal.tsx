import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  Award,
  Plus,
  UserPlus,
  Download,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Calendar,
  ShieldCheck,
  Search
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Organization, Classroom, InstitutionalReport } from '../../types';

export const InstitutionPortal: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState<{
    organization: Organization;
    classroomsCount: number;
    teachersCount: number;
    learnersCount: number;
  } | null>(null);
  const [report, setReport] = useState<InstitutionalReport | null>(null);
  const [classrooms, setClassrooms] = useState<Array<Classroom & { enrolledCount?: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');

  // Form states
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassBatch, setNewClassBatch] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollRole, setEnrollRole] = useState<'learner' | 'teacher'>('learner');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadOrgDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const orgRes = await api.getMyOrganization();
      if (orgRes.success && orgRes.data) {
        setOrgData(orgRes.data);
        const reportRes = await api.getInstitutionalReport();
        if (reportRes.success && reportRes.data) {
          setReport(reportRes.data.report);
          setClassrooms(reportRes.data.classrooms);
          if (reportRes.data.classrooms.length > 0) {
            setSelectedClassroomId(reportRes.data.classrooms[0].id);
          }
        }
      } else {
        setOrgData(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load institution portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgDashboard();
  }, [user]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || !newOrgCode) return;
    setSubmitting(true);
    try {
      const res = await api.createOrganization(newOrgName, newOrgCode);
      if (res.success) {
        setSuccessMsg('Institution onboarded successfully! Welcome to Enterprise SignBridge.');
        setShowCreateOrgModal(false);
        await loadOrgDashboard();
      } else {
        setError(res.error || 'Failed to onboard institution.');
      }
    } catch (err: any) {
      setError(err?.message || 'Onboarding error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;
    setSubmitting(true);
    try {
      const res = await api.createClassroom({
        name: newClassName,
        gradeOrBatch: newClassBatch
      });
      if (res.success) {
        setSuccessMsg(`Classroom "${newClassName}" created successfully.`);
        setShowCreateClassModal(false);
        setNewClassName('');
        setNewClassBatch('');
        await loadOrgDashboard();
      } else {
        setError(res.error || 'Failed to create classroom.');
      }
    } catch (err: any) {
      setError(err?.message || 'Creation error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrollLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollEmail || !selectedClassroomId) return;
    setSubmitting(true);
    try {
      const res = await api.enrollLearner(selectedClassroomId, enrollEmail, enrollRole);
      if (res.success) {
        setSuccessMsg(`${enrollRole === 'teacher' ? 'Teacher' : 'Learner'} ${enrollEmail} enrolled successfully.`);
        setShowEnrollModal(false);
        setEnrollEmail('');
        await loadOrgDashboard();
      } else {
        setError(res.error || 'Failed to enroll member.');
      }
    } catch (err: any) {
      setError(err?.message || 'Enrollment error.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReportJson = () => {
    if (!report || !orgData) return;
    const exportData = {
      institution: orgData.organization,
      summary: report,
      classrooms,
      exportTimestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SignBridge_Report_${orgData.organization.code}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Loading Enterprise Institution Portal…</p>
      </div>
    );
  }

  // Not enrolled in an organization yet -> Self-serve Registration
  if (!orgData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-slate-900 dark:text-slate-100">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto text-3xl">
            🏛️
          </div>
          <div>
            <h1 className="text-3xl font-black">Enterprise & School Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
              Empower your school, deaf academy, or university with tenant-isolated classrooms, teacher progress monitoring, and compliance analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-500 mb-2" />
              <div className="font-bold text-sm">Tenant Isolation</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Student data is strictly siloed to your institution.</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <GraduationCap className="w-5 h-5 text-cyan-500 mb-2" />
              <div className="font-bold text-sm">Classroom Batches</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Organize students into batches with designated teachers.</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <Award className="w-5 h-5 text-amber-500 mb-2" />
              <div className="font-bold text-sm">Official Reports</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Export verifiable pass-rate and completion audits.</div>
            </div>
          </div>

          <button
            onClick={() => setShowCreateOrgModal(true)}
            className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-md"
          >
            Register Your Institution
          </button>
        </div>

        {/* Create Org Modal */}
        {showCreateOrgModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black">Register School / Organization</h3>
                <button onClick={() => setShowCreateOrgModal(false)} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
              </div>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Institution Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. National Deaf Academy of Delhi"
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Unique Code (Uppercase)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NDAD-2026"
                    value={newOrgCode}
                    onChange={e => setNewOrgCode(e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm uppercase"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateOrgModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black disabled:opacity-60"
                  >
                    {submitting ? 'Creating…' : 'Create Institution'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const filteredClassrooms = classrooms.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.gradeOrBatch && c.gradeOrBatch.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <header className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-500">
              <Building2 className="w-4 h-4" /> {orgData.organization.name} ({orgData.organization.code})
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black">Institution Management Portal</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enterprise dashboard for managing classrooms, enrolling learners, and tracking real Indian Sign Language competency.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadReportJson}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-cyan-500" /> Export Audit Report
            </button>
            <button
              onClick={() => setShowCreateClassModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> New Classroom
            </button>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs">✕</button>
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>
          <button onClick={() => setError(null)} className="text-xs">✕</button>
        </div>
      )}

      {/* Institutional KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Total Enrolled</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black mt-2">{report?.totalStudents ?? orgData.learnersCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">{report?.totalTeachers ?? orgData.teachersCount} Certified Teachers</div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Classrooms</span>
            <BookOpen className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black mt-2">{classrooms.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active Learning Batches</div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Curriculum Progress</span>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-500">{report?.averageCompletionRate ?? 0}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Average Completion</div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Assessment Pass Rate</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-purple-500">{report?.assessmentPassRate ?? 0}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Camera Assessment Pass</div>
        </div>
      </div>

      {/* Classrooms Section */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Classrooms & Batches</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Classrooms enrolled under this tenant</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search classrooms…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs w-48"
              />
            </div>
            <button
              onClick={() => {
                if (classrooms.length > 0) {
                  setSelectedClassroomId(classrooms[0].id);
                  setShowEnrollModal(true);
                } else {
                  setShowCreateClassModal(true);
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <UserPlus className="w-3.5 h-3.5" /> Enroll Member
            </button>
          </div>
        </div>

        {filteredClassrooms.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <p className="text-sm">No classrooms found.</p>
            <button
              onClick={() => setShowCreateClassModal(true)}
              className="mt-3 text-xs font-bold text-amber-500 hover:underline"
            >
              Create your first classroom batch →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClassrooms.map(c => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm">{c.name}</h3>
                      {c.gradeOrBatch && (
                        <span className="inline-block mt-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                          {c.gradeOrBatch}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {c.studentUserIds?.length || c.enrolledCount || 0} students
                    </span>
                  </div>
                  <div className="mt-4 text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Created {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Curriculum: Levels 1–4 ISL Core</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[11px] font-mono text-slate-400">{c.id}</span>
                  <button
                    onClick={() => {
                      setSelectedClassroomId(c.id);
                      setShowEnrollModal(true);
                    }}
                    className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" /> Enroll
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create Classroom Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">Create Classroom Batch</h3>
              <button onClick={() => setShowCreateClassModal(false)} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateClassroom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Classroom Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 9 — Beginners ISL"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Grade / Batch Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. BATCH-2026-A"
                  value={newClassBatch}
                  onChange={e => setNewClassBatch(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black disabled:opacity-60"
                >
                  {submitting ? 'Creating…' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Member Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">Enroll Member to Classroom</h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
            </div>
            <form onSubmit={handleEnrollLearner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Target Classroom</label>
                <select
                  value={selectedClassroomId}
                  onChange={e => setSelectedClassroomId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                >
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.gradeOrBatch || c.id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Member Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="student@school.edu.in"
                  value={enrollEmail}
                  onChange={e => setEnrollEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Role</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEnrollRole('learner')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      enrollRole === 'learner'
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Learner / Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnrollRole('teacher')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      enrollRole === 'teacher'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Teacher / Instructor
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black disabled:opacity-60"
                >
                  {submitting ? 'Enrolling…' : 'Enroll Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
