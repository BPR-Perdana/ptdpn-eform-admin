import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import bprLogo from '@/assets/bpr-logo.png';
import bankingBg from '@/assets/bg-login.png';

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;
        setLoading(true);
        try {
            await login(username, password);
        } catch (err: any) {
            toast.error('Login gagal', { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">

            {/* ── Kiri — background image + overlay ────────────────────── */}
            <div className="hidden lg:flex lg:w-2/3 relative items-center justify-center overflow-hidden">
                <img
                    src={bankingBg}
                    alt="BPR Perdana"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-hero opacity-80" />

                {/* Konten di atas overlay */}
                <div className="relative z-10 flex flex-col items-center gap-6 text-center px-12">
                    {/* <img
                        src={bprLogo}
                        alt="BPR Perdana Logo"
                        className="w-40 h-40 object-contain drop-shadow-2xl"
                    /> */}
                    <div>
                        {/* <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-3">
                            BPR Perdana
                        </h1> */}
                        <p className="text-white/85 text-lg max-w-sm leading-relaxed">
                            Internal Dashboard untuk pengelolaan pengajuan eForm nasabah.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Kanan — form login ────────────────────────────────────── */}
            <div className="w-full lg:w-1/3 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md">

                    {/* Logo mobile (tampil hanya di layar kecil) */}
                    <div className="flex flex-col items-center mb-8 lg:hidden">
                        <img
                            src={bprLogo}
                            alt="BPR Perdana"
                            className="w-20 h-20 object-contain mb-4"
                        />
                        <h1 className="text-2xl font-bold text-foreground">BPR Perdana</h1>
                    </div>

                    <Card className="border-0 shadow-lg">
                        <CardHeader className="space-y-1 pb-4">
                            <CardTitle className="text-2xl font-bold text-center">
                                Login
                            </CardTitle>
                            <p className="text-sm text-muted-foreground text-center">
                                Masukkan kredensial Anda untuk melanjutkan
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="Masukkan username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Masukkan password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading || !username || !password}
                                >
                                    {loading
                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Masuk...</>
                                        : 'Masuk'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <p className="text-center text-xs text-muted-foreground mt-6">
                        © {new Date().getFullYear()} BPR Perdana · Admin Portal
                    </p>
                </div>
            </div>
        </div>
    );
}