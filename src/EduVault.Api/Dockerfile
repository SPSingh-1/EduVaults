# Stage 1: Build the .NET application
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy project files and restore dependencies
COPY src/EduVault.Core/EduVault.Core.csproj src/EduVault.Core/
COPY src/EduVault.Infrastructure/EduVault.Infrastructure.csproj src/EduVault.Infrastructure/
COPY src/EduVault.Api/EduVault.Api.csproj src/EduVault.Api/
RUN dotnet restore src/EduVault.Api/EduVault.Api.csproj

# Copy the entire source code and build
COPY src/EduVault.Core/ src/EduVault.Core/
COPY src/EduVault.Infrastructure/ src/EduVault.Infrastructure/
COPY src/EduVault.Api/ src/EduVault.Api/
WORKDIR /app/src/EduVault.Api
RUN dotnet publish -c Release -o /out

# Stage 2: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /out .

# Render exposes and binds to port 8080 automatically in newer .NET container templates
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "EduVault.Api.dll"]
