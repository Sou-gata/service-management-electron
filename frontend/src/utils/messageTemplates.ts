export interface MessageTemplateParams {
    customerName: string;
    ticketId: string;
    brandModel: string;
    status: string;
    estimatedCost?: string;
    actualCost?: string;
}

export const statusMessageTemplates: Record<
    string,
    (params: MessageTemplateParams) => string
> = {
    Received: (params) => {
        const estCostStr = params.estimatedCost
            ? `\nEstimated Cost: ₹${params.estimatedCost}`
            : "";
        return `Dear ${params.customerName},\n\nWe have successfully received your ${params.brandModel} for diagnostics. Your ticket ID is #SR-${params.ticketId}.${estCostStr}\n\nOur team has initiated the inspection process, and we will update you shortly with our findings. Thank you for your trust.`;
    },
    Servicing: (params) =>
        `Dear ${params.customerName},\n\nYour ${params.brandModel} (Ticket ID: #SR-${params.ticketId}) is currently undergoing servicing. Our certified technician is working on the device to ensure optimal performance. We will notify you as soon as the service is complete.`,
    Completed: (params) =>
        `Dear ${params.customerName},\n\nWe are pleased to inform you that the repair/service for your ${params.brandModel} (Ticket ID: #SR-${params.ticketId}) has been completed successfully. Your device is now ready for pickup/delivery.\n\nThank you for choosing us!`,
    Delivered: (params) => {
        const costStr = params.actualCost
            ? `\nTotal Cost: ₹${params.actualCost}`
            : "";
        return `Dear ${params.customerName},\n\nYour ${params.brandModel} (Ticket ID: #SR-${params.ticketId}) has been successfully delivered/picked up.${costStr}\n\nWe appreciate your business. Please feel free to reach out if you have any questions or need further assistance.`;
    },
};

export const getStatusMessage = (
    status: string,
    params: MessageTemplateParams
): string => {
    const templateFn = statusMessageTemplates[status];
    const baseMessage = templateFn
        ? templateFn(params)
        : `Dear ${params.customerName},\n\nThis is an update regarding your service request for the ${params.brandModel} (Ticket ID: #SR-${params.ticketId}). The current status of your request is: ${status}.`;

    return `${baseMessage}\n\nRegards,\nRADHA IT SOLUTION & SERVICES\nA UNIT OF COMPUTER WORLD INDIA`;
};
