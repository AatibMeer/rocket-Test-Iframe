export class ResolverUtilities {
    public static parseJwt(token) {
        var parsedToken;
        var base64Url;
        var base64;
        try {
            base64Url = token.split('.')[1];
            base64 = base64Url.replace('-', '+').replace('_', '/');
            parsedToken = JSON.parse(window.atob(base64));
        } catch {
            parsedToken = null;
        }
        return parsedToken;
    };
}