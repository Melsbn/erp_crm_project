import smtplib
from html import escape
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


async def send_reset_code_email(to_email: str, reset_code: str):
    """Send password reset code via email"""
    try:
        msg = MIMEMultipart()
        msg['From'] = settings.FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "Password Reset Code - Admin Panel"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
                <p style="color: #666; font-size: 16px;">You requested a password reset for your admin account.</p>
                
                <div style="background: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your verification code:</p>
                    <h1 style="margin: 0; color: #2563eb; font-size: 36px; letter-spacing: 5px;">{reset_code}</h1>
                </div>
                
                <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this reset, please ignore this email.</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


async def send_invoice_reminder_email(
    to_email: str,
    client_name: str,
    invoice_number: str,
    amount_due: float,
    due_status: str,
):
    """Send invoice payment reminder email."""
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = f"Rappel de paiement - Facture {invoice_number}"

        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; text-align: center;">Rappel de paiement</h2>
                <p style="color: #374151; font-size: 15px;">Bonjour {client_name},</p>
                <p style="color: #4b5563; font-size: 15px;">
                    Nous vous rappelons que la facture <strong>{invoice_number}</strong> est actuellement en statut
                    <strong>{due_status}</strong>.
                </p>

                <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin: 18px 0;">
                    <p style="margin: 0; color: #1e3a8a; font-size: 14px;">Montant restant à payer</p>
                    <h3 style="margin: 6px 0 0 0; color: #1d4ed8; font-size: 28px;">{amount_due:.2f} EUR</h3>
                </div>

                <p style="color: #4b5563; font-size: 14px;">
                    Merci de procéder au règlement dans les meilleurs délais.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                    Ceci est un message automatique.
                </p>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(body, "html"))

        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()

        return True
    except Exception as e:
        print(f"Error sending invoice reminder email: {e}")
        return False


async def send_new_user_credentials_email(
    to_email: str,
    user_name: str,
    temporary_password: str,
):
    """Send initial login credentials to a newly created user."""
    try:
        safe_user_name = escape(user_name)
        safe_temporary_password = escape(temporary_password)

        msg = MIMEMultipart()
        msg["From"] = settings.FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = "Your CRM account has been created"

        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; text-align: center;">Welcome to CRM ERP</h2>
                <p style="color: #374151; font-size: 15px;">Hello {safe_user_name},</p>
                <p style="color: #4b5563; font-size: 15px;">
                    Your account has been created. You can sign in using the email address that received this message.
                </p>

                <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin: 18px 0;">
                    <p style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 14px;">Temporary password</p>
                    <h3 style="margin: 0; color: #1d4ed8; font-size: 24px; letter-spacing: 1px;">{safe_temporary_password}</h3>
                </div>

                <p style="color: #4b5563; font-size: 14px;">
                    For security, please reset your password after your first login.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                    This is an automatic message. If you were not expecting this account, contact your supervisor.
                </p>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(body, "html"))

        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()

        return True
    except Exception as e:
        print(f"Error sending new user credentials email: {e}")
        return False
