// The Boss's WhatsApp Number (Include country code, no + or spaces)
const WHATSAPP_NUMBER = "2348081975967";

document.addEventListener('DOMContentLoaded', () => {
    const leadForm = document.getElementById('lead-form');
    
    if (leadForm) {
        leadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submit-btn');
            const originalText = submitBtn.innerText;
            
            // UI Feedback: Loading state
            submitBtn.innerText = 'Redirecting to Secure Line...';
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-75', 'cursor-not-allowed');

            try {
                // Collect Data from Form
                const propertyInterest = document.getElementById('property-interest').value;

                // PREPARE THE WHATSAPP MESSAGE
                const messageText = `Hello Praise Dynasty, I want to request the VIP Property List for the ${propertyInterest}.`;
                const whatsappMessage = encodeURIComponent(messageText);
                
                // Build the WhatsApp URL
                const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

                // Trigger Success Popup so the user knows it worked
                if (typeof window.showSuccessPopup === 'function') {
                    window.showSuccessPopup();
                }
                
                // Clear the form
                leadForm.reset();

                // IMMEDIATELY REDIRECT TO WHATSAPP
                // Wait 1.5 seconds so they see the success popup first
                setTimeout(() => {
                    window.location.href = whatsappUrl;
                }, 1500);

            } catch (error) {
                console.error("Error creating WhatsApp link: ", error);
                alert("There was an error redirecting you. Please try again.");
            } finally {
                // Restore button state after a delay just in case they click "back" from WhatsApp
                setTimeout(() => {
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                }, 3000);
            }
        });
    }
});
