export interface MessageTemplateParams {
    customerName: string;
    ticketId: string;
    brandModel: string;
    status: string;
}

export const statusMessageTemplates: Record<string, (params: MessageTemplateParams) => string> = {
    Received: (params) =>
        `Dear ${params.customerName}, we have successfully received your ${params.brandModel} for diagnostics. Your ticket ID is #SR-${params.ticketId}. We will update you shortly on the inspection. Thank you!`,
    Servicing: (params) =>
        `Dear ${params.customerName}, your ${params.brandModel} (Ticket ID: #SR-${params.ticketId}) is now under servicing. Our technician is working on it. We will notify you once it's completed.`,
    Completed: (params) =>
        `Dear ${params.customerName}, the servicing/repair for your ${params.brandModel} (Ticket ID: #SR-${params.ticketId}) has been completed successfully. It is ready for delivery/pickup. Thank you!`,
    Delivered: (params) =>
        `Dear ${params.customerName}, your ${params.brandModel} (Ticket ID: #SR-${params.ticketId}) has been successfully delivered/picked up. Thank you for choosing us!`,
};

export const getStatusMessage = (status: string, params: MessageTemplateParams): string => {
    const templateFn = statusMessageTemplates[status];
    if (templateFn) {
        return templateFn(params);
    }
    // Default fallback message
    return `Dear ${params.customerName}, your service request for ${params.brandModel} (Ticket ID: #SR-${params.ticketId}) is currently: ${status}.`;
};
