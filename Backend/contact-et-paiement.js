require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const paypal = require('paypal-rest-sdk');
const path = require('path');


paypal.configure({
    'mode': 'sandbox', 
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
}); 


const app = express();
app.use(express.json());

app.post('/purchase-subscription', (req, res) => {
    const montantHT = 20.00;
    const montantTTC = montantHT * 1.20; 

    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "http://localhost:3000/success",
            "cancel_url": "http://localhost:3000/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Abonnement",
                    "sku": "001",
                    "price": montantTTC.toFixed(2),
                    "currency": "EUR",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "EUR",
                "total": montantTTC.toFixed(2)
            },
            "description": "Achat d'un abonnement"
        }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            throw error;
        } else {
            for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === 'approval_url') {
                    res.redirect(payment.links[i].href);
                }
            }
        }
    });
});

app.get('/success', (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
            "amount": {
                "currency": "EUR",
                "total": "24.00"
            }
        }]
    };

    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            // Générer la facture PDF
            const invoicePath = `./factures/facture_${payment.id}.pdf`;
            const doc = new PDFDocument();

            doc.pipe(fs.createWriteStream(invoicePath));

            doc.fontSize(25).text('Mes factures', { align: 'center' });

            doc.moveDown();
            doc.text(`Date : ${new Date().toISOString().split('T')[0]}`);
            doc.text(`Montant HT : 20.00 €`);
            doc.text(`Montant TTC : 24.00 €`);

            doc.moveDown();
            doc.text('Télécharger la facture', {
                link: `http://localhost:3000/telecharger-pdf/${payment.id}`,
                underline: true,
            });

            doc.end();

            res.send('Paiement effectué avec succès. Vous pouvez télécharger votre facture.');
        }
    });
});

app.post('/download-invoice', (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Id de facture requise' });
    }

    const invoicePath = `./factures/facture_${id}.pdf`;
    res.download(invoicePath, `facture_${id}.pdf`);
});

app.get('/telecharger-pdf/:id', (req, res) => {
    const invoicePath = path.join(__dirname, 'factures', `facture_${req.params.id}.pdf`);
    res.download(invoicePath, `facture_${req.params.id}.pdf`);
});


// Partie email

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL,
        pass: process.env.MDP_GG
    }
});

// Route pour envoyer l'email
app.post('/send-email', (req, res) => {
    const { to, subject, text } = req.body;

    const mailOptions = {
        from: process.env.MAIL,
        to,
        subject,
        text
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ error: error.toString() });
        }
        res.status(200).json({ message: 'Email envoyé: ' + info.response });
    });
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



