import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, ImagePlus, LogOut, Search, Trash2, Upload } from "lucide-react";
import { inventario } from "@/integrations/inventario/client";

type AdminProduct = {
  id: string;
  name: string;
  sku: string;
  image_url: string | null;
};

export const Route = createFileRoute("/admin/productos")({
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    void inventario.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data } = inventario.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (checkingSession) {
    return <CenteredMessage message="Verificando sesión…" />;
  }

  if (!session) {
    return <AdminLogin />;
  }

  return <ProductImageManager email={session.user.email ?? "Admin"} />;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const { error } = await inventario.auth.signInWithPassword({ email, password });
    if (error) setError("No pudimos iniciar sesión. Verificá tu correo y contraseña.");
    setSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f4f2] px-4">
      <div className="w-full max-w-md border border-black/10 bg-white p-7 shadow-sm sm:p-10">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/55 hover:text-black">
          <ArrowLeft className="size-4" /> Volver a la tienda
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45">Acceso privado</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Administrar imágenes</h1>
        <p className="mt-2 text-sm text-black/55">Ingresá con tu usuario administrador de Inventario Amigo.</p>
        <form onSubmit={login} className="mt-7 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider">
            Correo
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full border border-black/20 px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-black" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider">
            Contraseña
            <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full border border-black/20 px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-black" />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button disabled={submitting} className="h-11 w-full bg-black text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-50">
            {submitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}

function ProductImageManager({ email }: { email: string }) {
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const productsQuery = useQuery({
    queryKey: ["admin-products-images"],
    queryFn: async () => {
      const { data, error } = await inventario
        .from("products")
        .select("id,name,sku,image_url")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminProduct[];
    },
  });

  const products = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return productsQuery.data ?? [];
    return (productsQuery.data ?? []).filter(
      (product) => product.name.toLocaleLowerCase().includes(term) || product.sku.toLocaleLowerCase().includes(term),
    );
  }, [productsQuery.data, search]);

  const uploadImage = async (product: AdminProduct, file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no puede superar los 2 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Formato no permitido. Usá JPG, PNG o WebP.");
      return;
    }
    setBusyId(product.id);
    setError("");
    setNotice("");
    const body = new FormData();
    body.append("file", file);
    body.append("product_id", product.id);
    const { error } = await inventario.functions.invoke("upload-product-image", { body });
    if (error) setError(`No se pudo subir la imagen de ${product.name}. Tu usuario debe tener rol admin.`);
    else {
      setNotice(`Imagen de ${product.name} guardada correctamente.`);
      await productsQuery.refetch();
    }
    setBusyId(null);
  };

  const deleteImage = async (product: AdminProduct) => {
    if (!window.confirm(`¿Eliminar la imagen de ${product.name}?`)) return;
    setBusyId(product.id);
    setError("");
    setNotice("");
    const { error } = await inventario.functions.invoke("delete-product-image", {
      body: { product_id: product.id },
    });
    if (error) setError(`No se pudo eliminar la imagen de ${product.name}.`);
    else {
      setNotice(`Imagen de ${product.name} eliminada.`);
      await productsQuery.refetch();
    }
    setBusyId(null);
  };

  return (
    <main className="min-h-screen bg-[#f4f4f2]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-black/45">Panel administrativo</p>
            <h1 className="font-display text-2xl font-bold">Imágenes de productos</h1>
          </div>
          <button onClick={() => void inventario.auth.signOut()} className="inline-flex items-center gap-2 border border-black/20 px-3 py-2 text-xs font-semibold hover:border-black">
            <LogOut className="size-4" /> Salir
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-black/55">Sesión iniciada como {email}</p>
            <p className="mt-1 text-xs text-black/45">JPG, PNG o WebP · máximo 2 MB · una imagen por producto</p>
          </div>
          <label className="relative block w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/40" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto o SKU…" className="h-11 w-full border border-black/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-black" />
          </label>
        </div>
        {notice && <div className="mb-5 border border-green-700/20 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
        {error && <div className="mb-5 border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        {productsQuery.isLoading ? (
          <CenteredMessage message="Cargando productos…" />
        ) : productsQuery.error ? (
          <CenteredMessage message="No se pudieron cargar los productos." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="flex gap-4 border border-black/10 bg-white p-4">
                <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden bg-[#f4f4f2]">
                  {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-1" /> : <ImagePlus className="size-8 text-black/20" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h2>
                  <p className="mt-1 text-xs text-black/45">{product.image_url ? "Con imagen" : "Sin imagen"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <label className={`inline-flex cursor-pointer items-center gap-1.5 bg-black px-3 py-2 text-xs font-semibold text-white ${busyId === product.id ? "pointer-events-none opacity-50" : ""}`}>
                      {product.image_url ? <Upload className="size-3.5" /> : <ImagePlus className="size-3.5" />}
                      {product.image_url ? "Reemplazar" : "Subir"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadImage(product, file);
                        event.target.value = "";
                      }} />
                    </label>
                    {product.image_url && (
                      <button disabled={busyId === product.id} onClick={() => void deleteImage(product)} className="inline-flex items-center gap-1.5 border border-black/15 px-3 py-2 text-xs font-semibold hover:border-destructive hover:text-destructive disabled:opacity-50">
                        <Trash2 className="size-3.5" /> Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CenteredMessage({ message }: { message: string }) {
  return <div className="flex min-h-52 items-center justify-center text-sm text-black/50">{message}</div>;
}
