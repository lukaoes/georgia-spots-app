import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { categoryLabel, regionLabel } from "../constants";
import { CategoryIcon, Flag, CircleUser, Trash2, Lock } from "../icons";
import { CopyLinkModal } from "../components/CopyLinkModal";

type Tab = "pending" | "approved" | "rejected" | "pending_deletion" | "reports" | "users" | "reset_requests";

export function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [places, setPlaces] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [linkModal, setLinkModal] = useState<{ title: string; description: string; value: string } | null>(null);

  function loadPlaces(status: string) {
    setLoading(true);
    api
      .adminPlaces(status)
      .then((d) => setPlaces(d.places))
      .finally(() => setLoading(false));
  }

  function loadReports() {
    setLoading(true);
    api
      .adminReports()
      .then((d) => setReports(d.reports))
      .finally(() => setLoading(false));
  }

  function loadUsers(q?: string) {
    setLoading(true);
    api
      .adminUsers(q)
      .then((d) => setUsers(d.users))
      .finally(() => setLoading(false));
  }

  function loadResetRequests() {
    setLoading(true);
    api
      .adminPasswordResetRequests()
      .then((d) => setResetRequests(d.requests))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user?.is_admin) return;
    if (tab === "reports") loadReports();
    else if (tab === "users") loadUsers();
    else if (tab === "reset_requests") loadResetRequests();
    else loadPlaces(tab);
  }, [tab, user]);

  // debounce the search-as-you-type on the Users tab
  useEffect(() => {
    if (tab !== "users") return;
    const t = setTimeout(() => loadUsers(userSearch), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 px-4 text-center">
        <p className="text-[color:var(--color-ink-soft)]">
          <Link to="/login" className="text-[color:var(--color-clay)] underline">
            შედით სისტემაში
          </Link>
          .
        </p>
      </div>
    );
  }
  if (!user.is_admin) {
    return (
      <div className="max-w-md mx-auto mt-16 px-4 text-center">
        <p className="text-[color:var(--color-ink-soft)]">ეს გვერდი ხელმისაწვდომია მხოლოდ ადმინისტრატორებისთვის.</p>
      </div>
    );
  }

  async function approve(id: string) {
    await api.adminApprove(id);
    loadPlaces(tab === "reports" || tab === "users" || tab === "reset_requests" ? "pending" : tab);
  }
  async function reject(id: string) {
    const reason = prompt("უარყოფის მიზეზი (არასავალდებულო):") || undefined;
    await api.adminReject(id, reason);
    loadPlaces(tab);
  }
  async function restore(id: string) {
    await api.adminRestore(id);
    loadPlaces(tab);
  }
  async function remove(id: string) {
    if (!confirm("წავშალო ეს ადგილი სამუდამოდ?")) return;
    await api.adminDeletePlace(id);
    loadPlaces(tab);
  }
  async function dismissReport(id: string) {
    await api.adminDismissReport(id);
    loadReports();
  }
  async function toggleAdmin(id: string) {
    await api.adminToggleAdmin(id);
    loadUsers(userSearch);
  }
  async function deleteUser(id: string, name: string) {
    if (!confirm(`წავშალო მომხმარებელი „${name}“? წაიშლება მისი ყველა ადგილი, შეფასება და აქტივობა. ეს ქმედება შეუქცევადია.`)) return;
    await api.adminDeleteUser(id);
    loadUsers(userSearch);
  }
  async function generateTempPassword(id: string, label: string) {
    if (!confirm(`გამოვქმნათ პაროლის აღდგენის ბმული „${label}“-სთვის?`)) return;
    const d = await api.adminResetPassword(id);
    const url = `${window.location.origin}/reset-password/${d.token}`;
    setLinkModal({
      title: "პაროლის აღდგენის ბმული",
      description: `დააკოპირეთ და გაუგზავნეთ ეს ბმული „${label}“-ს ხელით. ბმული აქტიურია 48 საათის განმავლობაში და მუშაობს მხოლოდ ერთხელ — ის გახსნის გვერდს, სადაც მომხმარებელი თვითონ დააყენებს ახალ პაროლს.`,
      value: url,
    });
  }
  async function dismissResetRequest(id: string) {
    await api.adminDismissResetRequest(id);
    loadResetRequests();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: "განსახილველი" },
    { key: "approved", label: "დამტკიცებული" },
    { key: "rejected", label: "უარყოფილი" },
    { key: "pending_deletion", label: "წაშლის მოთხოვნები" },
    { key: "reports", label: "შეტყობინებები" },
    { key: "users", label: "მომხმარებლები" },
    { key: "reset_requests", label: "პაროლის აღდგენა" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-semibold text-[color:var(--color-forest)] mb-4">ადმინ პანელი</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
              tab === t.key
                ? "bg-[color:var(--color-forest)] text-white border-[color:var(--color-forest)]"
                : "border-[color:var(--color-stone-dark)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[color:var(--color-ink-soft)]">იტვირთება...</p>
      ) : tab === "reports" ? (
        <div className="flex flex-col gap-3">
          {reports.length === 0 && <p className="text-sm text-[color:var(--color-ink-soft)]">შეტყობინებები არ არის.</p>}
          {reports.map((r) => (
            <div key={r.id} className="bg-[color:var(--color-surface)] border border-[color:var(--color-stone)] rounded-xl p-4 flex items-start justify-between gap-3">
              <div>
                <Link to={`/place/${r.place_id}`} className="font-medium text-[color:var(--color-forest)] hover:underline">
                  {r.place_name}
                </Link>
                <p className="text-sm text-[color:var(--color-ink-soft)] mt-1">
                  მიზეზი: {r.reason} — გამომგზავნი: {r.reporter_name}
                </p>
                <p className="text-xs text-[color:var(--color-ink-soft)] mt-1">სტატუსი: {r.place_status}</p>
              </div>
              <button onClick={() => dismissReport(r.id)} className="text-xs text-[color:var(--color-ink-soft)] underline shrink-0">
                მოშორება
              </button>
            </div>
          ))}
        </div>
      ) : tab === "reset_requests" ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[color:var(--color-ink-soft)] flex items-center gap-1.5 mb-1">
            <Lock size={12} /> ეს მოთხოვნები არ აგზავნის არაფერს ავტომატურად — თქვენ თვითონ უნდა გამოუგზავნოთ ახალი პაროლი
            მომხმარებელს, მას შემდეგ რაც გამოქმნით მას.
          </p>
          {resetRequests.length === 0 && <p className="text-sm text-[color:var(--color-ink-soft)]">მოთხოვნები არ არის.</p>}
          {resetRequests.map((r) => (
            <div key={r.id} className="bg-[color:var(--color-surface)] border border-[color:var(--color-stone)] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[color:var(--color-forest)]">{r.email}</p>
                  <p className="text-sm text-[color:var(--color-ink-soft)]">მომხმარებლის სახელი: {r.username}</p>
                  {r.message && <p className="text-sm text-[color:var(--color-ink-soft)] mt-1">შენიშვნა: {r.message}</p>}
                  <p className="text-xs text-[color:var(--color-ink-soft)] mt-1">
                    {new Date(r.created_at).toLocaleString("ka-GE")}
                  </p>
                  {r.matched_user ? (
                    <p className="text-xs text-[color:var(--color-forest)] mt-1">
                      მოიძებნა ანგარიში: @{r.matched_user.username} ({r.matched_user.email})
                    </p>
                  ) : (
                    <p className="text-xs text-[color:var(--color-clay)] mt-1">შესაბამისი ანგარიში ვერ მოიძებნა</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {r.matched_user && (
                    <button
                      onClick={() => generateTempPassword(r.matched_user.id, r.matched_user.username)}
                      className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-forest)] text-white"
                    >
                      აღდგენის ბმულის გენერაცია
                    </button>
                  )}
                  <button
                    onClick={() => dismissResetRequest(r.id)}
                    className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-stone-dark)]"
                  >
                    მოშორება
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === "users" ? (
        <div>
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="ძებნა სახელით, username-ით ან ელ-ფოსტით..."
            className="w-full mb-3 rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2 text-sm"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-[color:var(--color-surface)] border border-[color:var(--color-stone)] rounded-xl overflow-hidden">
              <thead className="bg-[color:var(--color-bg)] text-[color:var(--color-ink-soft)]">
                <tr>
                  <th className="text-right p-3">მომხმარებელი</th>
                  <th className="text-right p-3">ელ-ფოსტა</th>
                  <th className="text-right p-3">ადგილები</th>
                  <th className="text-right p-3">შეფასებები</th>
                  <th className="text-right p-3">რეგისტრაცია</th>
                  <th className="text-right p-3">ადმინი</th>
                  <th className="text-right p-3"></th>
                  <th className="text-right p-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-[color:var(--color-ink-soft)]">
                      მომხმარებელი ვერ მოიძებნა.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[color:var(--color-stone)]">
                    <td className="p-3">
                      <Link to={`/users/${u.username}`} className="flex items-center gap-2 hover:underline">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <CircleUser size={18} className="text-[color:var(--color-stone-dark)]" />
                        )}
                        {u.name}
                        <span className="text-[color:var(--color-ink-soft)] font-normal">@{u.username}</span>
                      </Link>
                    </td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.places_count}</td>
                    <td className="p-3">{u.reviews_count}</td>
                    <td className="p-3">{new Date(u.created_at).toLocaleDateString("ka-GE")}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleAdmin(u.id)}
                        disabled={u.id === user.id}
                        className={`text-xs px-2 py-1 rounded-full border disabled:opacity-40 ${
                          u.is_admin
                            ? "bg-[color:var(--color-forest)] text-white border-[color:var(--color-forest)]"
                            : "border-[color:var(--color-stone-dark)]"
                        }`}
                      >
                        {u.is_admin ? "ადმინია" : "გახდეს ადმინი"}
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => generateTempPassword(u.id, u.username)}
                        className="text-xs px-2 py-1 rounded-full border border-[color:var(--color-stone-dark)] whitespace-nowrap"
                        title="აღდგენის ბმულის გენერაცია"
                      >
                        <Lock size={11} className="inline mr-1" />
                        ბმული
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => deleteUser(u.id, u.name)}
                        disabled={u.id === user.id}
                        className="text-[color:var(--color-clay)] disabled:opacity-30"
                        title="მომხმარებლის წაშლა"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {places.length === 0 && <p className="text-sm text-[color:var(--color-ink-soft)]">ადგილები არ არის.</p>}
          {places.map((p) => (
            <div key={p.id} className="bg-[color:var(--color-surface)] border border-[color:var(--color-stone)] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-[color:var(--color-stone)] flex items-center justify-center">
                  {p.cover_photo ? (
                    <img src={p.cover_photo} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <CategoryIcon category={p.category} size={22} className="text-[color:var(--color-forest)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/place/${p.id}`} className="font-medium text-[color:var(--color-forest)] hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-[color:var(--color-ink-soft)]">
                    {categoryLabel(p.category)} {p.region && `· ${regionLabel(p.region)}`} · დამატებულია: {p.owner_name} ({p.owner_email})
                  </p>
                  {p.flag_count > 0 && (
                    <p className="text-xs text-[color:var(--color-clay)] mt-1 flex items-center gap-1">
                      <Flag size={11} /> დარეპორტებულია {p.flag_count}-ჯერ
                    </p>
                  )}
                  {p.rejection_reason && (
                    <p className="text-xs text-[color:var(--color-ink-soft)] mt-1">უარყოფის მიზეზი: {p.rejection_reason}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {tab === "pending_deletion" ? (
                    <>
                      <button onClick={() => remove(p.id)} className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-clay)] text-white">
                        წაშლის დადასტურება
                      </button>
                      <button onClick={() => restore(p.id)} className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-stone-dark)]">
                        უარყოფა (დაბრუნება)
                      </button>
                    </>
                  ) : (
                    <>
                      {tab !== "approved" && (
                        <button onClick={() => approve(p.id)} className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-forest)] text-white">
                          დამტკიცება
                        </button>
                      )}
                      {tab !== "rejected" && (
                        <button onClick={() => reject(p.id)} className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-stone-dark)]">
                          უარყოფა
                        </button>
                      )}
                      <button onClick={() => remove(p.id)} className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-clay)] text-[color:var(--color-clay)]">
                        წაშლა
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {linkModal && (
        <CopyLinkModal
          title={linkModal.title}
          description={linkModal.description}
          value={linkModal.value}
          onClose={() => setLinkModal(null)}
        />
      )}
    </div>
  );
}
