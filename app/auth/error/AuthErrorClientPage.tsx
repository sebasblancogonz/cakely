'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  AlertTriangle,
  ShieldAlert,
  KeyRound,
  LogIn,
  ShoppingCart,
  Home
} from 'lucide-react';

interface ErrorDisplayInfo {
  title: string;
  message: string;
  icon: React.ElementType;
  cta?: {
    href: string;
    text: string;
    icon?: React.ElementType;
  };
  secondaryCta?: {
    href: string;
    text: string;
    icon?: React.ElementType;
  };
}

const errorMessages: Record<string, ErrorDisplayInfo> = {
  missing_plan: {
    title: 'Suscripción Requerida',
    message:
      'Necesitas un plan activo o una prueba vigente para acceder a esta sección. Por favor, elige un plan o actualiza tu suscripción.',
    icon: ShoppingCart,
    cta: { href: '/ajustes/suscripcion', text: 'Ver Planes de Suscripción' },
    secondaryCta: { href: '/pedidos', text: 'Ir a Mi Panel', icon: Home }
  },
  forbidden: {
    title: 'Acceso Prohibido',
    message:
      'No tienes los permisos necesarios para acceder a este recurso o realizar esta acción. Si crees que es un error, contacta con el administrador.',
    icon: ShieldAlert,
    cta: { href: '/', text: 'Volver al Inicio', icon: Home }
  },
  NoInvitation: {
    title: 'Invitación Requerida',
    message:
      'Necesitas una invitación válida para registrarte o acceder a este recurso. Por favor, verifica tu invitación o contacta a quien te invitó.',
    icon: AlertTriangle,
    cta: { href: '/login', text: 'Intentar Iniciar Sesión', icon: LogIn }
  },

  Configuration: {
    title: 'Error de Configuración',
    message:
      'Hay un problema con la configuración del servidor de autenticación. Por favor, contacta al soporte técnico.',
    icon: ShieldAlert,
    cta: { href: '/', text: 'Volver al Inicio', icon: Home }
  },
  AccessDenied: {
    title: 'Acceso Denegado',
    message:
      'No se te ha permitido el acceso. Esto puede ocurrir si no has concedido los permisos necesarios o si tu cuenta no está autorizada.',
    icon: ShieldAlert,
    cta: { href: '/login', text: 'Intentar de Nuevo', icon: LogIn }
  },
  Verification: {
    title: 'Error de Verificación',
    message:
      'El enlace de verificación de email es inválido, ha expirado o ya ha sido utilizado. Por favor, intenta solicitar uno nuevo o contacta a soporte.',
    icon: AlertTriangle,
    cta: { href: '/login', text: 'Ir a Login', icon: LogIn }
  },
  OAuthSignin: {
    title: 'Error de Inicio de Sesión OAuth',
    message:
      'Hubo un problema al intentar iniciar sesión con tu proveedor externo (Google, GitHub, etc.). Por favor, inténtalo de nuevo.',
    icon: AlertTriangle,
    cta: { href: '/login', text: 'Intentar de Nuevo', icon: LogIn }
  },
  OAuthCallback: {
    title: 'Error en Retorno OAuth',
    message:
      'Hubo un problema al procesar la respuesta de tu proveedor externo después del inicio de sesión. Por favor, inténtalo de nuevo.',
    icon: AlertTriangle,
    cta: { href: '/login', text: 'Intentar de Nuevo', icon: LogIn }
  },
  OAuthAccountNotLinked: {
    title: 'Cuenta No Vinculada',
    message:
      'Este correo electrónico ya está registrado con otro método de inicio de sesión. Por favor, inicia sesión con el método original para vincular esta nueva cuenta, o usa una cuenta de correo diferente.',
    icon: AlertTriangle,
    cta: { href: '/login', text: 'Ir a Login', icon: LogIn }
  },
  EmailSignin: {
    title: 'Error de Enlace de Email',
    message:
      'El enlace de inicio de sesión por email es inválido o ha expirado. Por favor, solicita uno nuevo.',
    icon: KeyRound,
    cta: { href: '/login', text: 'Ir a Login', icon: LogIn }
  },
  CredentialsSignin: {
    title: 'Credenciales Inválidas',
    message:
      'El nombre de usuario o la contraseña son incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.',
    icon: KeyRound,
    cta: { href: '/login', text: 'Intentar de Nuevo', icon: LogIn }
  },
  SessionRequired: {
    title: 'Inicio de Sesión Requerido',
    message: 'Debes iniciar sesión para acceder a esta página.',
    icon: LogIn,
    cta: { href: '/login', text: 'Iniciar Sesión' }
  },
  Default: {
    title: 'Error de Autenticación',
    message:
      'Ha ocurrido un error durante el proceso de autenticación. Por favor, inténtalo de nuevo o contacta a soporte.',
    icon: AlertTriangle,
    cta: { href: '/login', text: 'Intentar de Nuevo', icon: LogIn }
  },
  ProPlanRequired: {
    title: 'Plan Pro Requerido',
    message:
      'Necesitas un plan Pro activo para acceder a esta sección. Por favor, actualiza tu suscripción.',
    icon: ShoppingCart,
    cta: { href: '/ajustes/suscripcion', text: 'Ver Planes de Suscripción' },
    secondaryCta: { href: '/pedidos', text: 'Ir a Mi Panel', icon: Home }
  },
  unknown_error: {
    title: 'Error Inesperado',
    message:
      'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde o contacta a soporte.',
    icon: AlertTriangle,
    cta: { href: '/', text: 'Volver al Inicio', icon: Home }
  }
};

export default function AuthErrorClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorInfo, setErrorInfo] = useState<ErrorDisplayInfo>(
    errorMessages.unknown_error
  );

  useEffect(() => {
    const errorCode = searchParams.get('error');
    if (errorCode && errorMessages[errorCode]) {
      setErrorInfo(errorMessages[errorCode]);
      console.log(`[AuthErrorPage] Mostrando error para código: ${errorCode}`);
    } else if (errorCode) {
      console.warn(`[AuthErrorPage] Código de error no mapeado: ${errorCode}`);
      setErrorInfo({
        title: 'Error No Especificado',
        message: `Ha ocurrido un error (código: ${errorCode}). Si el problema persiste, por favor, contacta a soporte.`,
        icon: AlertTriangle,
        cta: { href: '/', text: 'Volver al Inicio', icon: Home }
      });
    } else {
      console.log(
        `[AuthErrorPage] No se encontró código de error en la URL. Mostrando error por defecto.`
      );
      setErrorInfo(errorMessages.unknown_error);
    }
  }, [searchParams]);

  const FallbackCtaIcon = LogIn;

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12 px-4 text-center">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 dark:bg-destructive/20 p-4 rounded-full w-fit mb-4">
            <errorInfo.icon className="h-10 w-10 sm:h-12 sm:w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-destructive">
            {errorInfo.title}
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-2 text-md leading-relaxed">
            {errorInfo.message}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6 justify-center">
          {errorInfo.cta && (
            <Button
              className="w-full sm:w-auto"
              onClick={() => router.push(errorInfo.cta!.href)}
              size="lg"
            >
              {React.createElement(errorInfo.cta.icon || FallbackCtaIcon, {
                className: 'mr-2 h-4 w-4'
              })}
              {errorInfo.cta.text}
            </Button>
          )}
          {errorInfo.secondaryCta && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push(errorInfo.secondaryCta!.href)}
              size="lg"
            >
              {errorInfo.secondaryCta.icon &&
                React.createElement(errorInfo.secondaryCta.icon, {
                  className: 'mr-2 h-4 w-4'
                })}
              {errorInfo.secondaryCta.text}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
