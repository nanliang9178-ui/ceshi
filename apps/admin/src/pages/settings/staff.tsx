import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { ROLE_TEXT } from '../../lib/format';
import { formatTime } from '../../lib/utils';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Badge, Card, CardTitle, Spinner } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Field, Input, Select } from '../../components/ui/field';
import { Modal } from '../../components/ui/modal';

interface Staff {
  id: string;
  username: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt?: string | null;
  createdAt: string;
}

const ROLE_HINT: Record<string, string> = {
  OWNER: '全部权限，包含支付配置与员工管理',
  MANAGER: '除支付配置与员工管理外的全部权限',
  STAFF: '仅订单处理与菜品估清',
};

export default function StaffSettingsPage() {
  const toast = useToast();
  const { me } = useAuth();
  const [list, setList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [pwdTarget, setPwdTarget] = useState<Staff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'STAFF' });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await api.get<Staff[]>('/admin/staff');
    setList(data);
  }, []);

  useEffect(() => {
    load()
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
  }, [load, toast]);

  const create = async () => {
    if (!form.username.trim() || !form.name.trim() || form.password.length < 6) {
      toast.error('请填写账号、姓名，且密码至少 6 位');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/staff', { ...form, username: form.username.trim(), name: form.name.trim() });
      toast.success('员工账号已创建');
      setCreateOpen(false);
      setForm({ username: '', password: '', name: '', role: 'STAFF' });
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const update = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.put(`/admin/staff/${editTarget.id}`, {
        name: editTarget.name,
        role: editTarget.role,
        status: editTarget.status,
      });
      toast.success('员工信息已更新');
      setEditTarget(null);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!pwdTarget) return;
    if (newPassword.length < 6) {
      toast.error('密码至少 6 位');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/admin/staff/${pwdTarget.id}/password`, { password: newPassword });
      toast.success('密码已重置');
      setPwdTarget(null);
      setNewPassword('');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/admin/staff/${deleteTarget.id}`);
      toast.success('员工已删除');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (loading) return <Spinner label="正在加载员工…" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle
          title="员工与权限"
          subtitle="多人协作时可为店员开通独立账号，操作留痕可追溯"
          action={
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
              新增员工
            </Button>
          }
        />
        <div className="overflow-hidden rounded-xl border border-line/70">
          <table className="w-full text-[13px]">
            <thead className="bg-cream/70 text-[11.5px] text-ink-900/45">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">员工</th>
                <th className="px-4 py-2.5 text-left font-medium">登录账号</th>
                <th className="px-4 py-2.5 text-left font-medium">角色</th>
                <th className="px-4 py-2.5 text-left font-medium">状态</th>
                <th className="px-4 py-2.5 text-left font-medium">最近登录</th>
                <th className="px-4 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((staff) => (
                <tr key={staff.id} className="border-t border-line/60 transition hover:bg-cream/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-600">
                        {staff.name.slice(0, 1)}
                      </span>
                      <div>
                        <p className="font-medium text-ink-900">{staff.name}</p>
                        <p className="text-[11px] text-ink-900/35">{ROLE_HINT[staff.role]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-900/60">{staff.username}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        staff.role === 'OWNER'
                          ? 'bg-brand-50 text-brand-700 ring-brand-200'
                          : staff.role === 'MANAGER'
                            ? 'bg-blue-50 text-blue-700 ring-blue-200'
                            : 'bg-ink-900/5 text-ink-600 ring-ink-900/10'
                      }
                    >
                      {ROLE_TEXT[staff.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[12px] ${staff.status === 'ACTIVE' ? 'text-emerald-600' : 'text-ink-900/35'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${staff.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-ink-900/25'}`} />
                      {staff.status === 'ACTIVE' ? '正常' : '已停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-900/45">
                    {staff.lastLoginAt ? formatTime(staff.lastLoginAt, true) : '从未登录'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditTarget(staff)}
                        className="cursor-pointer rounded-md p-1.5 text-ink-900/40 transition hover:bg-ink-900/5 hover:text-brand-600"
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPwdTarget(staff);
                          setNewPassword('');
                        }}
                        className="cursor-pointer rounded-md p-1.5 text-ink-900/40 transition hover:bg-ink-900/5 hover:text-brand-600"
                        title="重置密码"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={staff.id === me?.name || staff.role === 'OWNER'}
                        onClick={() => setDeleteTarget(staff)}
                        className="cursor-pointer rounded-md p-1.5 text-ink-900/40 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-900/35">
          <Users size={12} />
          老板账号不可删除；至少需要保留一名老板账号
        </p>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="新增员工"
        description="员工使用账号密码登录商户后台"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button size="sm" loading={saving} icon={<UserPlus size={14} />} onClick={create}>
              创建账号
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="登录账号" required>
              <Input
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                placeholder="如 xiaoli"
                maxLength={30}
              />
            </Field>
            <Field label="姓名" required>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="如 小李"
                maxLength={20}
              />
            </Field>
          </div>
          <Field label="初始密码" required hint="至少 6 位，可登录后自行修改">
            <Input
              type="text"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="如 staff888"
              maxLength={32}
            />
          </Field>
          <Field label="角色权限">
            <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="STAFF">店员 · 订单处理与估清</option>
              <option value="MANAGER">店长 · 除支付与员工外全部权限</option>
              <option value="OWNER">老板 · 全部权限</option>
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="编辑员工"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>
              取消
            </Button>
            <Button size="sm" loading={saving} onClick={update}>
              保存
            </Button>
          </>
        }
      >
        {editTarget && (
          <div className="space-y-3">
            <Field label="姓名">
              <Input value={editTarget.name} onChange={(event) => setEditTarget({ ...editTarget, name: event.target.value })} />
            </Field>
            <Field label="角色">
              <Select value={editTarget.role} onChange={(event) => setEditTarget({ ...editTarget, role: event.target.value })}>
                <option value="STAFF">店员</option>
                <option value="MANAGER">店长</option>
                <option value="OWNER">老板</option>
              </Select>
            </Field>
            <Field label="账号状态">
              <Select value={editTarget.status} onChange={(event) => setEditTarget({ ...editTarget, status: event.target.value })}>
                <option value="ACTIVE">正常</option>
                <option value="DISABLED">停用（无法登录）</option>
              </Select>
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(pwdTarget)}
        onClose={() => setPwdTarget(null)}
        title={`重置「${pwdTarget?.name || ''}」的密码`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPwdTarget(null)}>
              取消
            </Button>
            <Button size="sm" loading={saving} onClick={resetPassword}>
              确认重置
            </Button>
          </>
        }
      >
        <Field label="新密码" required hint="至少 6 位，请线下告知该员工">
          <Input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} maxLength={32} />
        </Field>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="删除员工"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="danger" size="sm" onClick={remove}>
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-ink-900/70">
          确定删除员工「<b className="text-ink-900">{deleteTarget?.name}</b>」？删除后该账号立即无法登录，历史操作记录会保留。
        </p>
      </Modal>
    </div>
  );
}
