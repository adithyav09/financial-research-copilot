"""
SEC service for fetching 10-K filings from SEC EDGAR.
Real implementation with retry logic and HTML parsing.
"""

import asyncio
import httpx
import re
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from typing import Dict, Optional

from app.core.config import settings


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError))
)
async def fetch_latest_10k(ticker: str) -> dict:
    """
    Fetch the latest 10-K filing for a given ticker using SEC EDGAR API.
    
    Args:
        ticker: Company ticker symbol
        
    Returns:
        Dictionary with filing metadata and content
    """
    headers = {"User-Agent": settings.sec_user_agent}
    
    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        try:
            # Step 1: Resolve ticker to CIK
            search_url = f"https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&forms=10-K"
            response = await client.get(search_url)
            response.raise_for_status()
            
            # Rate limit: wait 0.5 seconds between requests
            await asyncio.sleep(0.5)
            
            search_data = response.json()
            if not search_data.get("hits") or not search_data["hits"]["hits"]:
                raise ValueError(f"No 10-K filings found for ticker {ticker}")
            
            # Get CIK from first hit
            cik = search_data["hits"]["hits"][0]["_source"]["ciks"][0]
            
            # Step 2: Get filing history
            cik_padded = str(cik).zfill(10)
            submissions_url = f"https://data.sec.gov/submissions/CIK{cik_padded}.json"
            response = await client.get(submissions_url)
            response.raise_for_status()
            
            # Rate limit: wait 0.5 seconds between requests
            await asyncio.sleep(0.5)
            
            submissions_data = response.json()
            
            # Step 3: Find most recent 10-K
            recent_filings = submissions_data["filings"]["recent"]
            
            # Convert dict to list of dictionaries
            filing_list = []
            for i in range(len(recent_filings["accessionNumber"])):
                filing = {
                    "accessionNumber": recent_filings["accessionNumber"][i],
                    "filingDate": recent_filings["filingDate"][i],
                    "form": recent_filings["form"][i],
                    "primaryDocument": recent_filings["primaryDocument"][i]
                }
                filing_list.append(filing)
            
            tenk_filings = [
                f for f in filing_list 
                if f["form"] == "10-K"
            ]
            
            if not tenk_filings:
                raise ValueError(f"No 10-K filings in submission history for {ticker}")
            
            latest_filing = tenk_filings[0]
            accession_number = latest_filing["accessionNumber"]
            filing_date = latest_filing["filingDate"]
            
            # Step 4: Get primary document URL
            accession_no_dashes = accession_number.replace("-", "")
            index_url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{accession_no_dashes}/{accession_number}-index.htm"
            
            response = await client.get(index_url)
            response.raise_for_status()
            
            # Rate limit: wait 0.5 seconds between requests
            await asyncio.sleep(0.5)
            
            # Step 5: Parse index to find primary document
            soup = BeautifulSoup(response.content, "html.parser")
            primary_doc_link = None
            
            # Look for the main 10-K document (usually the largest .htm file)
            for link in soup.find_all("a", href=True):
                href = link.get("href", "")
                if href.endswith(".htm") and "10-k" in href.lower():
                    primary_doc_link = href
                    break
            
            if not primary_doc_link:
                # Fallback: try to find any .htm file
                for link in soup.find_all("a", href=True):
                    href = link.get("href", "")
                    if href.endswith(".htm"):
                        primary_doc_link = href
                        break
            
            if not primary_doc_link:
                raise ValueError(f"Could not find primary 10-K document for {ticker}")
            
            # Step 6: Download and parse the filing
            if primary_doc_link.startswith("/"):
                doc_url = f"https://www.sec.gov{primary_doc_link}"
            else:
                doc_url = primary_doc_link
            
            response = await client.get(doc_url)
            response.raise_for_status()
            
            # Rate limit: wait 0.5 seconds between requests
            await asyncio.sleep(0.5)
            
            # Step 7: Clean HTML content
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text content
            content = soup.get_text()
            
            # Clean up whitespace
            content = re.sub(r'\s+', ' ', content).strip()
            
            # Truncate to 400,000 characters max
            if len(content) > 400000:
                content = content[:400000]
            
            # Extract filing year
            filing_year = int(filing_date.split("-")[0])
            
            return {
                "ticker": ticker.upper(),
                "filing_type": "10-K",
                "filing_date": filing_date,
                "filing_year": filing_year,
                "content": content,
                "url": doc_url,
                "cik": str(cik)
            }
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise Exception(f"SEC rate limit exceeded for {ticker}: {str(e)}")
            elif e.response.status_code == 503:
                raise Exception(f"SEC service unavailable for {ticker}: {str(e)}")
            else:
                raise Exception(f"SEC API error for {ticker}: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to fetch 10-K for {ticker}: {str(e)}")
